package com.ssafy.ssarvis.common.dto;

import java.util.List;

public record ListResponseDto<T>(
    Integer count,
    List<T> contents
) {
    public static <T> ListResponseDto<T> from(List<T> contents) {
        return new ListResponseDto<>(contents.size(), contents);
    }
}
