package com.ssafy.ssarvis.notification.service;

import com.ssafy.ssarvis.notification.dto.response.NotificationCountResponseDto;
import com.ssafy.ssarvis.notification.dto.response.NotificationResponseDto;
import com.ssafy.ssarvis.user.entity.User;

import java.util.List;

public interface NotificationService {

    void sendFollowRequestNotification(User sender, User receiver, Long followRequestId);

    void sendFollowAcceptNotification(User sender, User receiver, Long followId);

    List<NotificationResponseDto> getNotifications(Long userId);

    void deleteNotification(Long userId, Long notificationId);

    void readNotification(Long userId, Long notificationId);

    NotificationCountResponseDto countUnreadNotifications(Long userId);

    void sendFollowDirectNotification(User sender, User receiver, Long followId);

}
