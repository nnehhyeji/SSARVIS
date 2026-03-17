package com.ssafy.ssarvis.user.dto.response;

public record DuplicateCheckResponseDto (
    Boolean isDuplicate
){

    public static DuplicateCheckResponseDto from(Boolean isDuplicate) {
        return new DuplicateCheckResponseDto(isDuplicate);
    }
}
