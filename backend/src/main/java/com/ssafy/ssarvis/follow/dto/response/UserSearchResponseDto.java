package com.ssafy.ssarvis.follow.dto.response;

import com.ssafy.ssarvis.follow.entity.FollowStatus;

public record UserSearchResponseDto(
    Long userId,
    String customId,
    String nickname,
    String email,
    String profileImageUrl,
    FollowStatus followStatus
) {}