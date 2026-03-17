package com.ssafy.ssarvis.common.dto;

public record CursorRequestDto (
    Long cursorId,
    Integer size
){
    public CursorRequestDto{
        if (size == null || size < 1) {
            size = 20;
        } else if (size > 50) {
            size = 50;
        }
    }
}
