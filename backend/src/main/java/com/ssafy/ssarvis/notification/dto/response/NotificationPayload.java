package com.ssafy.ssarvis.notification.dto.response;

import lombok.Builder;

@Builder
public record NotificationPayload(

    Long senderId,
    String senderEmail,
    String senderCustomId,
    String senderNickname,
    String senderProfileImage,
    String message,
    String createdAt,
    Long targetUserId,
    Long followRequestId,
    Long followId,
    String direction

) {

}
