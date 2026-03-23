package com.ssafy.ssarvis.voice.dto.response;

public record EvaluationPromptResponseDto(
    String systemPrompt,
    Long promptCount
) {
}