package com.ssafy.ssarvis.voice.service.impl;

import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
import com.ssafy.ssarvis.voice.dto.response.AiVoiceResponseDto;
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

    @Async("voiceUploadExecutor")
    public void processVoiceWithAiAsync(Long userId, MultipartFile audioFile, String text) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            body.add("audio", new ByteArrayResource(audioFile.getBytes()) {
                @Override
                public String getFilename() {
                    return audioFile.getOriginalFilename();
                }
            });
            body.add("audio_text", text);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<AiVoiceResponseDto> response = restTemplate.postForEntity(
                aiServerUrl + "/api/v1/voice", requestEntity, AiVoiceResponseDto.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String modelId = response.getBody().data().voiceId();
                saveVoiceEntity(userId, modelId);
            }
        } catch (Exception e) {
            log.error("AI 서버 통신 실패 - 사용자 ID: {}, 원인: {}", userId, e.getMessage());
        }
    }

    private void saveVoiceEntity(Long userId, String modelId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        Voice voice = Voice.builder()
            .modelUuid(UUID.fromString(modelId))
            .name(user.getNickname())
            .user(user)
            .build();

        voiceRepository.save(voice);
        log.info("Voice 저장 성공: {} (ID: {})", user.getNickname(), modelId);
    }
}