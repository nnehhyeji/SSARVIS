package com.ssafy.ssarvis.notification.dto.response;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record NotificationPayload(

    Long senderId,
    String senderEmail,
    String senderNickname,
    String senderProfileImage,
    String message,
    LocalDateTime createdAt

) {

}
