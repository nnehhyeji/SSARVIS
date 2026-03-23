package com.ssafy.ssarvis.voice.dto.request;

public record EvaluationPromptRequestDto(
    String userInputQuestion,
    String userInputAnswer
) {
}
