package com.ssafy.ssarvis.follow.dto.response;

public record UserSearchResponseDto(
    Long userId,
    String nickname,
    String email
) {}