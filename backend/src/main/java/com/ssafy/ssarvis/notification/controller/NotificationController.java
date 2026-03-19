package com.ssafy.ssarvis.notification.controller;

import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.common.dto.BaseResponse;
import com.ssafy.ssarvis.notification.dto.response.NotificationCountResponseDto;
import com.ssafy.ssarvis.notification.dto.response.NotificationResponseDto;
import com.ssafy.ssarvis.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<BaseResponse<List<NotificationResponseDto>>> getNotifications(
        @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        Long userId = customUserDetails.getUserId();
        List<NotificationResponseDto> notifications = notificationService.getNotifications(userId);
        return ResponseEntity.ok(BaseResponse.success("알림 리스트 조회 성공", notifications));
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<BaseResponse<Void>> deleteNotification(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @PathVariable Long notificationId
    ) {
        Long userId = customUserDetails.getUserId();
        notificationService.deleteNotification(userId, notificationId);
        return ResponseEntity.ok(BaseResponse.success("알림 삭제 성공"));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<BaseResponse<Void>> readNotification(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @PathVariable Long notificationId
    ) {
        Long userId = customUserDetails.getUserId();
        notificationService.readNotification(userId, notificationId);
        return ResponseEntity.ok(BaseResponse.success("알림 읽음 처리 성공"));
    }

    // 읽지 않은 알림 개수
    @GetMapping("/count")
    public ResponseEntity<BaseResponse<NotificationCountResponseDto>> countUnreadNotifications(
        @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        Long userId = customUserDetails.getUserId();
        NotificationCountResponseDto count = notificationService.countUnreadNotifications(userId);
        return ResponseEntity.ok(BaseResponse.success("읽지 않은 알림 개수 조회 성공", count));
    }

}
