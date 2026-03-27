package com.ssafy.ssarvis.auth.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KakaoUserInfoResponseDto(
    Long id,
    @JsonProperty("kakao_account") KakaoAccount kakaoAccount
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record KakaoAccount(
        // null 검사 방어 필수
        String email,
        Profile profile
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Profile(
        String nickname,
        @JsonProperty("profile_image_url") String profileImageUrl
    ) {}
}