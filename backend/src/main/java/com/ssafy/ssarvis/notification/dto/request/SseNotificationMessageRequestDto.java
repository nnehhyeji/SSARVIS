package com.ssafy.ssarvis.notification.dto.request;

import com.ssafy.ssarvis.notification.dto.response.NotificationPayload;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SseNotificationMessageRequestDto implements Serializable {

    private Long receiverId;
    private String eventName;
    private NotificationPayload payload;

}
