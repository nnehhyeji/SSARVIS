package com.ssafy.ssarvis.follow.dto.request;

import jakarta.validation.constraints.NotNull;

public record FollowAcceptDto(
    @NotNull(message = "팔로우 요청 ID는 필수입니다.")
    Long followRequestId
) {
}
