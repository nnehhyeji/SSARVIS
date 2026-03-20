package com.ssafy.ssarvis.voice.dto.response;

import com.ssafy.ssarvis.voice.entity.VoiceHistory;

public record VoiceUploadResponseDto(String historyId) {
    public static VoiceUploadResponseDto from(VoiceHistory history) {
        return new VoiceUploadResponseDto(history.getId());
    }
}
