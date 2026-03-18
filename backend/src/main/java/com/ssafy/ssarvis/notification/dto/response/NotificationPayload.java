package com.ssafy.ssarvis.notification.dto.response;

import lombok.Builder;

@Builder
public record NotificationPayload(

    Long senderId,
    String senderEmail,
    String senderNickname,
    String senderProfileImage,
    String message,
    String createdAt

) {

}
