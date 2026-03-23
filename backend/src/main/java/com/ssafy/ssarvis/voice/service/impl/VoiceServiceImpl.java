package com.ssafy.ssarvis.voice.service.impl;

import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
import com.ssafy.ssarvis.voice.dto.response.*;
import com.ssafy.ssarvis.voice.entity.Voice;
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

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class VoiceServiceImpl implements VoiceService {

    private final VoiceRepository voiceRepository;
    private final UserRepository userRepository;
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
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

                user.updateUserPrompt(generatedPrompt);

                log.info("사용자 {}의 시스템 프롬프트 생성 성공", user.getNickname());
                return new PromptResponseDto(generatedPrompt);
            }

            throw new RuntimeException("AI 서버 응답 오류");

        } catch (Exception e) {
            log.error("프롬프트 생성 중 오류 발생: {}", e.getMessage());
            throw new RuntimeException("시스템 프롬프트 생성에 실패했습니다.");
        }
    }

    private String registerVoiceWithAi(MultipartFile audioFile, String text) {
        try {
            HttpHeaders headers = new HttpHeaders();
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            // 오디오 파일 파트
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
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        Voice voice = Voice.builder()
            .modelId(modelId)
            .name(user.getNickname())
            .voiceStt(sttText)
            .user(user)
            .build();

        voiceRepository.save(voice);
        log.info("Voice 저장 완료: {} (ID: {})", user.getNickname(), modelId);
    }
}