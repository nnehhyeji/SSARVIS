package com.ssafy.ssarvis.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

public record CursorInfo(
    Boolean hasNext,
    Long nextCursorId,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    Object nextCursorValue
) {
    public static CursorInfo of(boolean hasNext, Long nextCursorId, Object nextCursorValue) {
        return new CursorInfo(hasNext, nextCursorId, nextCursorValue);
    }
}