package com.ssafy.ssarvis.voice.service.impl;

import com.ssafy.ssarvis.assistant.entity.Assistant;
import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.assistant.repository.AssistantRepository;
import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
import com.ssafy.ssarvis.voice.dto.request.AiPromptRequestDto;
import com.ssafy.ssarvis.voice.dto.request.EvaluationPromptRequestDto;
import com.ssafy.ssarvis.voice.dto.response.*;
import com.ssafy.ssarvis.user.entity.Evaluation;
import com.ssafy.ssarvis.user.entity.Prompt;
import com.ssafy.ssarvis.user.entity.PromptType;
import com.ssafy.ssarvis.voice.entity.Voice;
import com.ssafy.ssarvis.user.repository.EvaluationRepository;
import com.ssafy.ssarvis.user.repository.PromptRepository;
import com.ssafy.ssarvis.voice.repository.VoiceRepository;
import com.ssafy.ssarvis.voice.service.VoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class VoiceServiceImpl implements VoiceService {

    private static final int PROMPT_GENERATION_THRESHOLD = 5;

    private final VoiceRepository voiceRepository;
    private final UserRepository userRepository;
    private final AssistantRepository assistantRepository;
    private final EvaluationRepository evaluationRepository;
    private final PromptRepository promptRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${spring.app.ai-server.url}")
    private String aiServerUrl;

    @Override
    @Transactional(readOnly = true)
    public VoiceInfoResponseDto getVoiceInfo(Long userId) {

        Voice voice = voiceRepository.findByUserId(userId)
            .stream()
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("등록된 음성 정보가 없습니다."));

        return VoiceInfoResponseDto.from(voice);
    }

    @Override
    public VoiceUploadResponseDto uploadVoice(Long userId, MultipartFile audioFile, String sttText) {

        String modelId = registerVoiceWithAi(audioFile, sttText);

        saveVoiceEntity(userId, modelId, sttText);

        return VoiceUploadResponseDto.of(modelId);
    }

    @Override
    public PromptResponseDto generateSystemPrompt(Long userId, Object rawJson) {
        try {
            log.info("AI 서버로 전달할 데이터: {}", rawJson);

            ResponseEntity<AiPromptResponseDto> response = restTemplate.postForEntity(
                aiServerUrl + "/api/v1/prompt",
                rawJson,
                AiPromptResponseDto.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String generatedPrompt = response.getBody().data().systemPrompt();

                User user = userRepository.findById(userId)
                    .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));

                Prompt prompt = Prompt.builder()
                    .user(user)
                    .promptText(generatedPrompt)
                    .promptType(PromptType.USER)
                    .build();

                promptRepository.save(prompt);

                log.info("사용자 {}의 시스템 프롬프트 생성 성공", user.getNickname());
                return new PromptResponseDto(generatedPrompt);
            }

            throw new RuntimeException("AI 서버 응답 오류");

        } catch (Exception e) {
            log.error("프롬프트 생성 중 오류 발생: {}", e.getMessage());
            throw new RuntimeException("시스템 프롬프트 생성에 실패했습니다.");
        }
    }

    @Transactional
    public EvaluationPromptResponseDto generateSystemPromptEvaluation(
        CustomUserDetails customUserDetails,
        Long targetUserId,
        EvaluationPromptRequestDto dto
    ) {
        User targetUser = userRepository.findById(targetUserId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));

        // 1. writer 결정: 토큰 있으면 nickname, 없으면(null) "익명"
        String writer = resolveWriter(customUserDetails);

        // 2. 새 Q&A 저장 (누적, 삭제하지 않음)
        Evaluation newEvaluation = Evaluation.builder()
            .user(targetUser)
            .userInputQue(dto.userInputQuestion())
            .userInputAns(dto.userInputAnswer())
            .writer(writer)
            .promptType(PromptType.NAMNA)
            .build();
        evaluationRepository.save(newEvaluation);

        // 3. 누적 카운트 확인 (5의 배수일 때만 프롬프트 생성)
        long currentCount = evaluationRepository.countByUserAndPromptType(targetUser, PromptType.NAMNA);

        if (currentCount % PROMPT_GENERATION_THRESHOLD != 0) {
            return new EvaluationPromptResponseDto("", currentCount);
        }

        // 4. 5의 배수 도달 → 최신 5개 Q&A로 AI 서버 호출
        // 4-1. 가장 최신 NAMNA Persona 프롬프트 조회 (없으면 빈 문자열)
        String existingSystemPrompt = promptRepository
            .findTopByUserAndPromptTypeOrderByIdDesc(targetUser, PromptType.NAMNA)
            .map(Prompt::getPromptText)
            .orElse("");

        // 4-2. 최신 5개 Q&A 조회 후 시간순 정렬 (id desc → asc 역정렬)
        List<Evaluation> latest5 = evaluationRepository
            .findTop5ByUserAndPromptTypeOrderByIdDesc(targetUser, PromptType.NAMNA);

        List<AiPromptRequestDto.QnaDto> qnaList = latest5.stream()
            .sorted(Comparator.comparingLong(Evaluation::getId))
            .map(e -> new AiPromptRequestDto.QnaDto(e.getUserInputQue(), e.getUserInputAns()))
            .toList();

        // 4-3. AI 서버 요청
        AiPromptRequestDto requestDto = new AiPromptRequestDto(existingSystemPrompt, qnaList);

        ResponseEntity<AiPromptResponseDto> aiResponse = restTemplate.postForEntity(
            aiServerUrl + "/api/v1/prompt",
            requestDto,
            AiPromptResponseDto.class
        );

        if (!aiResponse.getStatusCode().is2xxSuccessful()
            || aiResponse.getBody() == null
            || aiResponse.getBody().data() == null) {
            throw new CustomException("AI 서버 응답 오류", ErrorCode.INTERNAL_SERVER_ERROR);
        }

        String generatedPrompt = aiResponse.getBody().data().systemPrompt();

        // 5. 새 Persona 저장
        Prompt prompt = Prompt.builder()
            .user(targetUser)
            .promptText(generatedPrompt)
            .promptType(PromptType.NAMNA)
            .build();
        promptRepository.save(prompt);

        return new EvaluationPromptResponseDto(generatedPrompt, currentCount);
    }


    private String resolveWriter(CustomUserDetails customUserDetails) {
        if (customUserDetails == null) {
            return "익명";
        }
        User loginUser = userRepository.findById(customUserDetails.getUserId())
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));
        return loginUser.getNickname();
    }

    private String registerVoiceWithAi(MultipartFile audioFile, String text) {
        try {
            HttpHeaders headers = new HttpHeaders();
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            HttpHeaders audioHeaders = new HttpHeaders();
            audioHeaders.setContentType(MediaType.parseMediaType(audioFile.getContentType()));
            body.add("audio", new HttpEntity<>(new ByteArrayResource(audioFile.getBytes()) {
                @Override
                public String getFilename() {
                    return audioFile.getOriginalFilename();
                }
            }, audioHeaders));

            HttpHeaders textHeaders = new HttpHeaders();
            textHeaders.setContentType(MediaType.TEXT_PLAIN);
            body.add("audioText", new HttpEntity<>(text, textHeaders));

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<AiVoiceResponseDto> response = restTemplate.postForEntity(
                aiServerUrl + "/api/v1/voice", requestEntity, AiVoiceResponseDto.class);


            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody().data().voiceId();
            }
            throw new RuntimeException("AI 서버로부터 voiceId를 가져오지 못했습니다.");

        } catch (Exception e) {
            log.error("AI 서버 통신 실패 - 원인: {}", e.getMessage());
            throw new RuntimeException("음성 생성 중 AI 서버와의 통신에 실패했습니다.");
        }
    }

    private void saveVoiceEntity(Long userId, String modelId, String sttText) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));

        Voice voice = Voice.builder()
            .modelId(modelId)
            .name(user.getNickname())
            .voiceStt(sttText)
            .user(user)
            .build();

        voiceRepository.save(voice);

        for (AssistantType assistantType : AssistantType.values()) {
            Assistant assistant = Assistant.builder()
                .assistantType(assistantType)
                .name(user.getNickname() + "_" + assistantType.name())
                .voice(voice)
                .user(user)
                .build();
            assistantRepository.save(assistant);
        }

        log.info("Voice & Assistant Model 저장 완료: {} (ID: {})", user.getNickname(), modelId);
    }

}