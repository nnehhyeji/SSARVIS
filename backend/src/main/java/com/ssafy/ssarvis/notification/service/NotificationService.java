package com.ssafy.ssarvis.notification.service;

import com.ssafy.ssarvis.user.entity.User;

public interface NotificationService {

    void sendFollowRequestNotification(User sender, User receiver);

    void sendFollowAcceptNotification(User sender, User receiver);

}
