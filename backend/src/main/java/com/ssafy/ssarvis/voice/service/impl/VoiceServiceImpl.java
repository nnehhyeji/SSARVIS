package com.ssafy.ssarvis.voice.service.impl;

import com.ssafy.ssarvis.common.service.S3Uploader;
import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
import com.ssafy.ssarvis.voice.dto.request.AiVoiceRequestDto;
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
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class VoiceServiceImpl implements VoiceService {

    private final S3Uploader s3Uploader;
    private final VoiceHistoryRepository voiceHistoryRepository;
    private final VoiceRepository voiceRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${spring.app.ai-server.url}")
    private String aiServerUrl;

    @Override
    public VoiceUploadResponseDto uploadVoice(Long userId, MultipartFile audioFile, String sttText) {

        String s3Url = s3Uploader.upload(audioFile, "voices/" + userId);

        VoiceHistory voiceHistory = VoiceHistory.builder()
            .userId(userId)
            .s3Url(s3Url)
            .sttText(sttText)
            .build();

        VoiceHistory savedHistory = voiceHistoryRepository.save(voiceHistory);

        processVoiceWithAiAsync(userId, s3Url, sttText);

        return VoiceUploadResponseDto.from(savedHistory);
    }

    @Async("voiceUploadExecutor") // 비동기 실행
    public void processVoiceWithAiAsync(Long userId, String s3Url, String text) {
        try {
            // AI 서버 호출
            AiVoiceRequestDto request = new AiVoiceRequestDto(s3Url, text);
            ResponseEntity<AiVoiceResponseDto> response = restTemplate.postForEntity(
                aiServerUrl + "/api/v1/voices", request, AiVoiceResponseDto.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String modelId = response.getBody().data().voiceId();
                saveVoiceEntity(userId, modelId);
            }
        } catch (Exception e) {
            log.error("AI 서버 통신 중 오류 발생 - 사용자: {}, 사유: {}", userId, e.getMessage());
            // 필요 시 여기서 재처리 로직이나 알림 전송 (Slack 등)을 수행합니다.
        }
    }

    private void saveVoiceEntity(Long userId, String modelId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // MySQL Voice 엔티티 저장[cite: 4]
        Voice voice = Voice.builder()
            .modelUuid(UUID.fromString(modelId))
            .name(user.getNickname()) // 사용자 닉네임으로 저장
            .user(user)
            .build();

        voiceRepository.save(voice);
        log.info("Voice 등록 완료 - 사용자: {}, VoiceID: {}", user.getNickname(), modelId);
    }
}