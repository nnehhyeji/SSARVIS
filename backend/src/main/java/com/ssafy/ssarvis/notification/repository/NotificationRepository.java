package com.ssafy.ssarvis.notification.repository;

import com.ssafy.ssarvis.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

}
