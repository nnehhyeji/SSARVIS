package com.ssafy.ssarvis.voice.dto.response;

import com.ssafy.ssarvis.voice.entity.VoiceHistory;

import java.time.LocalDateTime;

public record VoiceUploadResponseDto(
    String id,
    Long userId,
    String s3Url,
    String sttText,
    LocalDateTime createdAt
) {
    public static VoiceUploadResponseDto from(VoiceHistory voiceHistory) {
        return new VoiceUploadResponseDto(
            voiceHistory.getId(),
            voiceHistory.getUserId(),
            voiceHistory.getS3Url(),
            voiceHistory.getSttText(),
            voiceHistory.getCreatedAt()
        );
    }
}