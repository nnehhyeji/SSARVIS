package com.ssafy.ssarvis.voice.dto.response;

import com.ssafy.ssarvis.user.entity.Evaluation;

import java.time.LocalDateTime;

public record EvaluationItemResponseDto(
    Long id,
    String userInputQue,
    String userInputAns,
    String writer,
    LocalDateTime createdAt
) {
    public static EvaluationItemResponseDto from(Evaluation evaluation) {
        return new EvaluationItemResponseDto(
            evaluation.getId(),
            evaluation.getUserInputQue(),
            evaluation.getUserInputAns(),
            evaluation.getWriter(),
            evaluation.getCreatedAt()
        );
    }
}
