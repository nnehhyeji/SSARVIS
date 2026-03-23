package com.ssafy.ssarvis.voice.dto.response;

public record NonMemberPromptResponseDto(
    String systemPrompt,
    Long promptCount
) {
}