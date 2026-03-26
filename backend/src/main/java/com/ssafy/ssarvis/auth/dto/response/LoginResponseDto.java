package com.ssafy.ssarvis.auth.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import lombok.Builder;

@Builder
@JsonInclude(Include.NON_NULL)
public record LoginResponseDto(
    boolean isNewUser,

    String registerUUID,

    String accessToken,
    Long timeout
) {

    public static LoginResponseDto createExistingUserResponse(String accessToken, Long timeout) {
        return LoginResponseDto.builder()
            .isNewUser(false)
            .accessToken(accessToken)
            .timeout(timeout)
            .build();
    }
    public static LoginResponseDto createOAuthSignupUserResponse( String registerUUID) {
        return LoginResponseDto.builder()
            .isNewUser(true)
            .registerUUID(registerUUID)
            .build();
    }
}