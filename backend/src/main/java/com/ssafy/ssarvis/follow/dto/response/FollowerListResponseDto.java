package com.ssafy.ssarvis.follow.dto.response;

public record FollowerListResponseDto(
    Long followId,
    Long followerId,
    String nickname,
    String customId,
    String followerProfileImgUrl,
    String description
) {
}