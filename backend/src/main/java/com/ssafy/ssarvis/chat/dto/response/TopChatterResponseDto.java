package com.ssafy.ssarvis.chat.dto.response;

public record TopChatterResponseDto(
    Long userId,
    String nickname,
    String profileImageUrl,
    long totalMessageCount
) {
}