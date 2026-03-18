package com.ssafy.ssarvis.follow.dto.request;

public record FollowListResponseDto(
    Long followId,
    Long userId,
    String nickname, // 일단 PK랑 nickname, description 만 보내주고 추후 어떤거 보내주면 되는지 말해주세용
    String description
) {}