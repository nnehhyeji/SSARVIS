package com.ssafy.ssarvis.notification.service;

import com.ssafy.ssarvis.notification.dto.response.NotificationResponseDto;
import com.ssafy.ssarvis.user.entity.User;

import java.util.List;

public interface NotificationService {

    void sendFollowRequestNotification(User sender, User receiver);

    void sendFollowAcceptNotification(User sender, User receiver);

    List<NotificationResponseDto> getNotifications(Long userId);

}
