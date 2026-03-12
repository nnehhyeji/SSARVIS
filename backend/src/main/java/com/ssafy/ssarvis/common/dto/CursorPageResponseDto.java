package com.ssafy.ssarvis.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

public record CursorPageResponseDto<T>(
    CursorInfo cursor,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    SortInfo sort,
    List<T> contents
) {

    public static <T> CursorPageResponseDto<T> of(CursorInfo cursor, SortInfo sort,
        List<T> contents) {
        return new CursorPageResponseDto<>(cursor, sort, contents);
    }
}
