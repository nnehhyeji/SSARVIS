package com.ssafy.ssarvis.user.dto.request;

import com.ssafy.ssarvis.user.entity.Costume;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserUpdateRequestDto(
    @Size(min = 8, max = 20, message = "비밀번호는 8자 이상 20자 이하로 입력해주세요.")
    @Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$",
        message = "비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다."
    )
    String password,
    @Size(min = 2, max = 12, message = "닉네임은 2자 이상 12자 이하로 입력해주세요.")
    String nickname,
    @Size(max = 255, message = "한줄소개는 255자 이하로 입력해야 합니다.")
    String description,
    Costume costume,
    String voicePassword
) {
}
