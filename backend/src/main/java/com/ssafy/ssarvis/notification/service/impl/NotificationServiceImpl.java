package com.ssafy.ssarvis.notification.service.impl;

import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.common.sse.RedisMessagePublisher;
import com.ssafy.ssarvis.follow.entity.FollowDirection;
import com.ssafy.ssarvis.notification.dto.request.SseNotificationMessageRequestDto;
import com.ssafy.ssarvis.notification.dto.response.NotificationCountResponseDto;
import com.ssafy.ssarvis.notification.dto.response.NotificationPayload;
import com.ssafy.ssarvis.notification.dto.response.NotificationResponseDto;
import com.ssafy.ssarvis.notification.entity.Notification;
import com.ssafy.ssarvis.notification.entity.NotificationType;
import com.ssafy.ssarvis.notification.entity.NotificationTypeEnum;
import com.ssafy.ssarvis.notification.repository.NotificationRepository;
import com.ssafy.ssarvis.notification.repository.NotificationTypeRepository;
import com.ssafy.ssarvis.notification.service.NotificationService;
import com.ssafy.ssarvis.user.entity.User;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final RedisMessagePublisher redisMessagePublisher;
    private final NotificationRepository notificationRepository;
    private final NotificationTypeRepository notificationTypeRepository;

    @Override
    public void sendFollowRequestNotification(User sender, User receiver, Long followRequestId) {

        NotificationType type = notificationTypeRepository.findByName(
                NotificationTypeEnum.FOLLOW_REQUEST.name())
            .orElseThrow(() -> new CustomException(
                ErrorCode.NOTIFICATION_TYPE_NOT_FOUND.getMessage(),
                ErrorCode.NOTIFICATION_TYPE_NOT_FOUND)
            );

        Notification notification = Notification.builder()
            .receiver(receiver)
            .notificationType(type)
            .message(sender.getCustomId() + "님이 친구 신청을 보냈습니다.")
            .build();

        notificationRepository.save(notification);

        NotificationPayload notificationPayload = NotificationPayload.builder()
            .senderId(sender.getId())
            .senderEmail(sender.getEmail())
            .senderCustomId(sender.getCustomId())
            .senderProfileImage(sender.getProfileImageUrl())
            .createdAt(LocalDateTime.now().toString())
            .senderNickname(sender.getNickname())
            .targetUserId(receiver.getId())
            .followRequestId(followRequestId)
            .direction(FollowDirection.FOLLOWER.name())
            .message(sender.getNickname() + "님이 친구 신청을 보냈습니다.")
            .build();

        redisMessagePublisher.publisher(
            SseNotificationMessageRequestDto.builder()
                .receiverId(receiver.getId())
                .eventName(NotificationTypeEnum.FOLLOW_REQUEST.name())
                .payload(notificationPayload)
                .build()
        );

        log.info("친구 신청 알림 발송 - 전송자 PK: {}, 응답자 PK: {}",
            sender.getId(), receiver.getId());
    }

    @Override
    public void sendFollowAcceptNotification(User sender, User receiver, Long followId) {

        NotificationType type = notificationTypeRepository.findByName(
                NotificationTypeEnum.FOLLOW_ACCEPT.name())
            .orElseThrow(
                () -> new CustomException(ErrorCode.NOTIFICATION_TYPE_NOT_FOUND.getMessage(),
                    ErrorCode.NOTIFICATION_TYPE_NOT_FOUND));

        String msg = receiver.getNickname() + "님이 친구 신청을 수락했습니다.";
        Notification notification = notificationRepository.save(Notification.builder()
            .receiver(sender).notificationType(type).message(msg).build());

        NotificationPayload payload = NotificationPayload.builder()
            .senderId(receiver.getId())
            .senderNickname(receiver.getNickname())
            .senderCustomId(receiver.getCustomId())
            .senderProfileImage(receiver.getProfileImageUrl())
            .targetUserId(sender.getId())
            .followId(followId)
            .direction(FollowDirection.FOLLOWING.name())
            .message(msg)
            .createdAt(notification.getCreatedAt().toString())
            .build();

        redisMessagePublisher.publisher(SseNotificationMessageRequestDto.builder()
            .receiverId(sender.getId())
            .eventName(NotificationTypeEnum.FOLLOW_ACCEPT.name())
            .payload(payload).build());

        log.info("친구 수락 알림 발송 - 전송자 PK: {}, 응답자 PK: {}",
            sender.getId(), receiver.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponseDto> getNotifications(Long userId) {
        return notificationRepository
            .findAllByReceiverIdOrderByCreatedAtDesc(userId)
            .stream()
            .map(NotificationResponseDto::from)
            .toList();
    }

    @Override
    public void deleteNotification(Long userId, Long notificationId) {
        Notification notification = notificationRepository
            .findByIdAndReceiverId(notificationId, userId)
            .orElseThrow(() -> new CustomException(
                ErrorCode.NOTIFICATION_NOT_FOUND.getMessage(),
                ErrorCode.NOTIFICATION_NOT_FOUND
            ));

        notificationRepository.delete(notification);
        log.info("알림 삭제 - 요청자 PK: {}, 알림 ID: {}", userId, notificationId);
    }

    @Override
    public void readNotification(Long userId, Long notificationId) {
        Notification notification = notificationRepository
            .findByIdAndReceiverId(notificationId, userId)
            .orElseThrow(() -> new CustomException(
                ErrorCode.NOTIFICATION_NOT_FOUND.getMessage(),
                ErrorCode.NOTIFICATION_NOT_FOUND
            ));

        notification.markAsRead();
        log.info("알림 읽음 처리 - 요청자 PK: {}, 알림 ID: {}", userId, notificationId);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationCountResponseDto countUnreadNotifications(Long userId) {
        Long count = notificationRepository.countByReceiverIdAndIsReadFalse(userId);
        return new NotificationCountResponseDto(count);
    }


    @Override
    public void sendFollowDirectNotification(User sender, User receiver, Long followId) {
        // 공개 계정 즉시 팔로우 시
        String msg = sender.getNickname() + "님이 회원님을 팔로우했습니다.";

        NotificationType type = notificationTypeRepository.findByName(
                NotificationTypeEnum.FOLLOW_CREATED.name())
            .orElseThrow(
                () -> new CustomException(ErrorCode.NOTIFICATION_TYPE_NOT_FOUND.getMessage(),
                    ErrorCode.NOTIFICATION_TYPE_NOT_FOUND));

        Notification notification = notificationRepository.save(Notification.builder()
            .receiver(receiver)
            .notificationType(type)
            .message(msg)
            .build());

        NotificationPayload payload = NotificationPayload.builder()
            .senderId(sender.getId())
            .senderNickname(sender.getNickname())
            .senderCustomId(sender.getCustomId())
            .senderEmail(sender.getEmail())
            .senderProfileImage(sender.getProfileImageUrl())
            .targetUserId(receiver.getId())
            .followId(followId)
            .direction(FollowDirection.FOLLOWER.name())
            .message(msg)
            .createdAt(notification.getCreatedAt().toString())
            .build();

        redisMessagePublisher.publisher(SseNotificationMessageRequestDto.builder()
            .receiverId(receiver.getId())
            .eventName(NotificationTypeEnum.FOLLOW_CREATED.name())
            .payload(payload)
            .build());

        log.info("직접 팔로우 알림 발송 - 팔로워 PK: {}, 팔로잉 PK: {}", sender.getId(), receiver.getId());
    }
}
