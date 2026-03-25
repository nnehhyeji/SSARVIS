package com.ssafy.ssarvis.user.dto.request;

public record UserVerifyRequestDto(
    String email,
    String code
) {
}
