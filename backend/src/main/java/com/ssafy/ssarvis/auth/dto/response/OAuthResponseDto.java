package com.ssafy.ssarvis.auth.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import lombok.Builder;

@Builder
@JsonInclude(Include.NON_NULL)
public record OAuthResponseDto(
    boolean isNewUser,
    boolean isLinked,

    String registerUUID,
    String nickName,
    String profileImageUrl,
    String email,

    String accessToken,
    Long timeout
) {

    public static OAuthResponseDto signupUserResponse(String registerUUID,
        String nickName, String profileImageUrl, String email) {
        return OAuthResponseDto.builder()
            .isNewUser(true)
            .registerUUID(registerUUID)
            .nickName(nickName)
            .profileImageUrl(profileImageUrl)
            .email(email)
            .build();
    }

    public static OAuthResponseDto loginUserResponse(String accessToken,
        Long timeout) {
        return OAuthResponseDto.builder()
            .isNewUser(false)
            .accessToken(accessToken)
            .timeout(timeout)
            .build();
    }

    public static OAuthResponseDto loginAndLinkUserResponse(String accessToken,
        Long timeout) {
        return OAuthResponseDto.builder()
            .isNewUser(false)
            .isLinked(true)
            .accessToken(accessToken)
            .timeout(timeout)
            .build();
    }
}
