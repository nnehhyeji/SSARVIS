package com.ssafy.ssarvis.voice.dto.request;
import java.util.List;

public record AiPromptRequestDto(
    String systemPrompt,
    List<QnaDto> qna
) {
    public record QnaDto(
        String question,
        String answer
    ) {
    }
}

