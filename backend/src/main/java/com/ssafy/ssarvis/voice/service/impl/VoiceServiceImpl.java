package com.ssafy.ssarvis.voice.service.impl;

import com.ssafy.ssarvis.common.service.S3Uploader;
import com.ssafy.ssarvis.voice.dto.response.VoiceUploadResponseDto;
import com.ssafy.ssarvis.voice.entity.VoiceHistory;
import com.ssafy.ssarvis.voice.repository.VoiceHistoryRepository;
import com.ssafy.ssarvis.voice.service.VoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class VoiceServiceImpl implements VoiceService {

    private final S3Uploader s3Uploader;
    private final VoiceHistoryRepository voiceHistoryRepository;

    @Override
    public VoiceUploadResponseDto uploadVoice(Long userId, MultipartFile audioFile, String sttText) {

        if (audioFile == null || audioFile.isEmpty()) {
            throw new IllegalArgumentException("음성 파일이 없습니다.");
        }

        String s3Url = s3Uploader.upload(audioFile, "voices/" + userId);

        VoiceHistory voiceHistory = VoiceHistory.builder()
            .userId(userId)
            .s3Url(s3Url)
            .sttText(sttText)
            .build();

        VoiceHistory saved = voiceHistoryRepository.save(voiceHistory);
        log.info("음성 저장 완료 - 요청자 PK: {}, mongoDB ID: {}", userId, saved.getId());

        return VoiceUploadResponseDto.from(saved);
    }

}
