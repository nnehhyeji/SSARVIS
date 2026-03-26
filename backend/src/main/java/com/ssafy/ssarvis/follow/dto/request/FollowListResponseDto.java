package com.ssafy.ssarvis.follow.dto.request;

public record FollowListResponseDto(
    Long followId,
    Long userId,
    String nickname,
    String customId,
    String followerProfileImgUrl,
    String description
) {}