package com.ssafy.ssarvis.notification.repository;

import com.ssafy.ssarvis.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByReceiverIdOrderByCreatedAtDesc(Long receiverId);

    Optional<Notification> findByIdAndReceiverId(Long id, Long receiverId);

    Long countByReceiverIdAndIsReadFalse(Long receiverId);

}
