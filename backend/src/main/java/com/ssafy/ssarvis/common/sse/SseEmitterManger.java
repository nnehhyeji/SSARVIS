package com.ssafy.ssarvis.common.sse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class SseEmitterManger {

    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    @Value("${sse.timeout}")
    private Long timeout;

    public SseEmitter connect(Long userId) {
        SseEmitter existing = emitters.get(userId);

        if (existing != null) {
            existing.complete();
        }

        SseEmitter emitter = new SseEmitter(timeout);

        emitter.onCompletion(() -> {
            log.info("SSE 연결 완료 - userId: {}", userId);
            emitters.remove(userId);
        });

        emitter.onTimeout(() -> {
            log.warn("SSE 타임아웃 - userId: {}", userId);
            emitters.remove(userId);
            emitter.complete();
        });

        emitter.onError(e -> {
            log.error("SSE 에러 - userId: {}", userId, e);
            emitters.remove(userId);
        });

        emitters.put(userId, emitter);

        sendToEmitter(userId, emitter, "connect", Map.of("message", "SSE 연결 성공"));

        log.info("SSE 연결 등록 - userId: {}, 현재 연결 수: {}", userId, emitters.size());
        return emitter;
    }

    public void sendToLocal(Long userId, String eventName, Object data) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) {
            log.debug("SSE 연결 없음 (다른 인스턴스 처리) - userId: {}", userId);
            return;
        }
        sendToEmitter(userId, emitter, eventName, data);
    }

    private void sendToEmitter(Long userId, SseEmitter emitter, String eventName, Object data) {
        try {
            emitter.send(
                SseEmitter.event()
                    .name(eventName)
                    .data(data, MediaType.APPLICATION_JSON)
            );
        } catch (IOException e) {
            log.error("SSE 전송 실패 - userId: {}", userId, e);
            emitters.remove(userId);
            emitter.completeWithError(e);
        }
    }

    public boolean isConnected(Long userId) {
        return emitters.containsKey(userId);
    }
}
