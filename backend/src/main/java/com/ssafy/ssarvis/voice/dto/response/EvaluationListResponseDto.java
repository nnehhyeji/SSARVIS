package com.ssafy.ssarvis.voice.dto.response;

import java.util.List;

public record EvaluationListResponseDto(
    Long userId,
    long totalCount,
    List<EvaluationItemResponseDto> evaluations
) {
    public static EvaluationListResponseDto of(Long userId, List<EvaluationItemResponseDto> items) {
        return new EvaluationListResponseDto(userId, items.size(), items);
    }
}