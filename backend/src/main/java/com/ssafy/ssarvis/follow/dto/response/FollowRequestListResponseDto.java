package com.ssafy.ssarvis.follow.dto.response;

public record FollowRequestListResponseDto(
    Long followRequestId,
    Long senderId,
    String senderNickname,
    String senderEmail
) {}