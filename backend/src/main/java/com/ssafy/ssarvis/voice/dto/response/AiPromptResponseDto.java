package com.ssafy.ssarvis.voice.dto.response;

public record AiPromptResponseDto(
    String message,
    PromptData data
) {
    public record PromptData(String systemPrompt) {
    }
}