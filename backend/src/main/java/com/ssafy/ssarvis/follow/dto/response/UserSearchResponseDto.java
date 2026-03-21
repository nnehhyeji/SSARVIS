package com.ssafy.ssarvis.follow.dto.response;

import com.ssafy.ssarvis.follow.entity.FollowStatus;

public record UserSearchResponseDto(
    Long userId,
    String nickname,
    String email,
    FollowStatus followStatus
) {}