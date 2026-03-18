package com.ssafy.ssarvis.common.sse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.ssarvis.notification.dto.request.SseNotificationMessageRequestDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
public class RedisMessageSubscriber implements MessageListener {

    private final ObjectMapper objectMapper;
    private final SseEmitterManager sseEmitterManager;

    public RedisMessageSubscriber(
        @Qualifier("redisObjectMapper") ObjectMapper objectMapper,
        SseEmitterManager sseEmitterManager
    ) {
        this.objectMapper = objectMapper;
        this.sseEmitterManager = sseEmitterManager;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            SseNotificationMessageRequestDto msg = objectMapper.readValue(
                message.getBody(), SseNotificationMessageRequestDto.class
            );
            log.info("Redis 수신 - receiverId: {}, event: {}",
                msg.getReceiverId(), msg.getEventName());

            sseEmitterManager.sendToLocal(
                msg.getReceiverId(),
                msg.getEventName(),
                msg.getPayload()
            );
        } catch (IOException e) {
            log.error("Redis 메시지 역직렬화 실패", e);
        }
    }
}