package com.ssafy.ssarvis.auth.dto.response;

import lombok.Builder;

@Builder
public record SocialUserInfoDto(
    String email,
    String nickname,
    String profileImageUrl,
    String provider,
    String providerId
) {

}
