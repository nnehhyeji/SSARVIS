package com.ssafy.ssarvis.follow.dto.request;

import jakarta.validation.constraints.NotNull;

public record FollowRequestDto(
    @NotNull(message = "대상 유저 ID는 필수입니다.")
    Long receiverId
) {
}
