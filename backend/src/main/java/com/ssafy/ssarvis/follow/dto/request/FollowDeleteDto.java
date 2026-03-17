package com.ssafy.ssarvis.follow.dto.request;

import jakarta.validation.constraints.NotNull;

public record FollowDeleteDto(
    @NotNull(message = "팔로우 ID는 필수입니다")
    Long followId
) {
}
