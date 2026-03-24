package com.ssafy.ssarvis.user.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UserCustomIdCheckRequestDto (
    @NotBlank(message = "아이디 필수 입력값입니다.")
    String customId
){

}
