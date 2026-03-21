package com.ssafy.ssarvis.voice.dto.response;

public record VoiceUploadResponseDto(
    String modelId,
    String message
) {
    public static VoiceUploadResponseDto of(String modelId) {
        return new VoiceUploadResponseDto(modelId, "음성 등록 성공");
    }
}
