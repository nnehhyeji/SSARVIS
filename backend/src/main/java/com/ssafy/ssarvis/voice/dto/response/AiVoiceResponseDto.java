package com.ssafy.ssarvis.voice.dto.response;

public record AiVoiceResponseDto(
    String message,
    AiData data) {
    public record AiData(
        String voiceId
    ) {
    }
}