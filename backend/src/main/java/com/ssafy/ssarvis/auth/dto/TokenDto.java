package com.ssafy.ssarvis.auth.dto;

public record TokenDto(
    String accessToken,
    String refreshToken
) {

    public static TokenDto from(String accessToken, String refreshToken) {
        return new TokenDto(accessToken, refreshToken);
    }
}
