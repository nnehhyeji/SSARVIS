package com.ssafy.ssarvis.common.sse;

import com.ssafy.ssarvis.common.constant.Constants;
import com.ssafy.ssarvis.notification.dto.request.SseNotificationMessageRequestDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisMessagePublisher {

    private final RedisTemplate<String, Object> redisTemplate;

    public void publisher(SseNotificationMessageRequestDto message) {
        log.info("Redis 발행 - receiverId: {}, event: {}",
            message.getReceiverId(), message.getEventName());
        redisTemplate.convertAndSend(Constants.SSE_NOTIFICATION_CHANNEL, message);
    }

}
