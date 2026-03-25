package com.ssafy.ssarvis.follow.dto.response;

public record FollowerListResponseDto(
    Long followerId,
    String nickname,
    String customId,
    String followerProfileImgUrl,
    String description
) {
}