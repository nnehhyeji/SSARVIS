package com.ssafy.ssarvis.auth.dto.response;

public record AccessTokenResponseDto(
    String accessToken,
    Long timeout
) {
}