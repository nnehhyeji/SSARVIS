package com.ssafy.ssarvis.notification.dto.response;

import com.ssafy.ssarvis.notification.entity.Notification;

import java.time.LocalDateTime;

public record NotificationResponseDto(
    Long notificationId,
    String eventName,
    String message,
    Boolean isRead,
    NotificationPayload payload,
    LocalDateTime createdAt
) {
    public static NotificationResponseDto from(Notification notification) {
        return new NotificationResponseDto(
            notification.getId(),
            notification.getNotificationType().getName(),
            notification.getMessage(),
            notification.getIsRead(),
            notification.getNotificationPayload(),
            notification.getCreatedAt()
        );
    }
}