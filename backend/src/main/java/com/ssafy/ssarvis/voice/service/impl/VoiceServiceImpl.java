package com.ssafy.ssarvis.voice.service.impl;

import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
import com.ssafy.ssarvis.voice.dto.response.AiPromptResponseDto;
import com.ssafy.ssarvis.voice.dto.response.AiVoiceResponseDto;
import com.ssafy.ssarvis.voice.dto.response.PromptResponseDto;
import com.ssafy.ssarvis.voice.dto.response.VoiceUploadResponseDto;
import com.ssafy.ssarvis.voice.entity.Voice;
import com.ssafy.ssarvis.voice.entity.VoiceHistory;
import com.ssafy.ssarvis.voice.repository.VoiceHistoryRepository;
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
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class VoiceServiceImpl implements VoiceService {

    private final VoiceHistoryRepository voiceHistoryRepository;
    private final VoiceRepository voiceRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${spring.app.ai-server.url}")
    private String aiServerUrl;

    @Override
    public VoiceUploadResponseDto uploadVoice(Long userId, MultipartFile audioFile, String sttText) {

        VoiceHistory voiceHistory = VoiceHistory.builder()
            .userId(userId)
            .s3Url("DIRECT_FILE_TRANSFER") // URL 대신 전송 방식 기록
            .sttText(sttText)
            .build();
        VoiceHistory savedHistory = voiceHistoryRepository.save(voiceHistory);

        processVoiceWithAiAsync(userId, audioFile, sttText);

        return VoiceUploadResponseDto.from(savedHistory);
    }

    @Override
    public PromptResponseDto generateSystemPrompt(Long userId, Object rawJson) {
        try {
            ResponseEntity<AiPromptResponseDto> response = restTemplate.postForEntity(
                aiServerUrl + "/api/v1/prompts", rawJson, AiPromptResponseDto.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String generatedPrompt = response.getBody().data().systemPrompt();

                User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

                user.updateUserPrompt(generatedPrompt); // 변경 감지(Dirty Checking)로 자동 저장

                log.info("사용자 {}의 시스템 프롬프트 업데이트 성공", user.getNickname());
                return new PromptResponseDto(generatedPrompt);
            }

            throw new RuntimeException("AI 서버 응답 오류");

        } catch (Exception e) {
            log.error("프롬프트 생성 중 오류 발생: {}", e.getMessage());
            throw new RuntimeException("시스템 프롬프트 생성에 실패했습니다.");
        }
    }


    @Async("voiceUploadExecutor")
    public void processVoiceWithAiAsync(Long userId, MultipartFile audioFile, String text) {
        try {
            // 1. 텍스트가 비어있는지 체크 (디버깅용 로그 추가)
            log.info("AI 서버로 전송할 텍스트: {}", text);
            if (text == null) text = "";

            HttpHeaders headers = new HttpHeaders();
            // Content-Type 설정은 여전히 하지 않습니다 (RestTemplate이 자동 생성)

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            // 2. 오디오 파일 파트 (HttpEntity로 감싸서 더 확실하게)
            HttpHeaders audioPartHeaders = new HttpHeaders();
            audioPartHeaders.setContentType(MediaType.parseMediaType(audioFile.getContentType()));

            HttpEntity<ByteArrayResource> audioEntity = new HttpEntity<>(
                new ByteArrayResource(audioFile.getBytes()) {
                    @Override
                    public String getFilename() {
                        return audioFile.getOriginalFilename();
                    }
                },
                audioPartHeaders
            );
            body.add("audio", audioEntity);

            // 3. 텍스트 파트 (HttpEntity로 감싸서 Content-Type 명시)
            HttpHeaders textPartHeaders = new HttpHeaders();
            textPartHeaders.setContentType(MediaType.TEXT_PLAIN); // 텍스트임을 명시

            HttpEntity<String> textEntity = new HttpEntity<>(text, textPartHeaders);
            body.add("audioText", textEntity); // FastAPI의 필드명인 audioText와 일치

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            // 호출
            ResponseEntity<AiVoiceResponseDto> response = restTemplate.postForEntity(
                aiServerUrl + "/api/v1/voice", requestEntity, AiVoiceResponseDto.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String modelId = response.getBody().data().voiceId();
                saveVoiceEntity(userId, modelId);
            }
        } catch (Exception e) {
            log.error("AI 서버 통신 실패 - 원인: {}", e.getMessage(), e);
        }
    }

    private void saveVoiceEntity(Long userId, String modelId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        // UUID.fromString() 없이 바로 빌더에 넣음
        Voice voice = Voice.builder()
            .modelId(modelId)
            .name(user.getNickname())
            .user(user)
            .build();

        voiceRepository.save(voice);
        log.info("Voice 저장 성공: {} (ID: {})", user.getNickname(), modelId);
    }
}