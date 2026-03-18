package com.ssafy.ssarvis.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserNicknameCheckRequestDto (
    @NotBlank(message = "닉네임은 필수 입력값입니다.")
    @Size(min = 2, max = 12, message = "닉네임은 2자 이상 12자 이하로 입력해주세요.")
    String nickname
){

}
