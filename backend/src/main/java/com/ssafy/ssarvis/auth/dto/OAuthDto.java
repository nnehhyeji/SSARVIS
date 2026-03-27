package com.ssafy.ssarvis.auth.dto;

import lombok.Builder;

@Builder
public record OAuthDto (
    boolean isNewUser,

    TokenDto tokenDto,

    String registerUUID
){

}
