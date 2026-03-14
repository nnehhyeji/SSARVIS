package com.ssafy.ssarvis.notification.dto.response;

import java.time.LocalDateTime;

public record NotificationPayload(

    Long senderId,
    String senderEmail,
    String senderNickname,
    String senderProfileImage,
    String message,
    LocalDateTime createdAt

) {

}
