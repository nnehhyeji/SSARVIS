package com.ssafy.ssarvis.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.ssarvis.chat.dto.request.AiChatRequestDto;
import com.ssafy.ssarvis.chat.interceptor.GuestFastApiWebSocketHandler;
import jakarta.websocket.ContainerProvider;
import jakarta.websocket.WebSocketContainer;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;

@Slf4j
@Service
@RequiredArgsConstructor
public class GuestAiRequestRelayService {

    private final ConcurrentHashMap<String, WebSocketSession> sessionMap = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final GuestChatRedisService redisService;

    @Value("${app.fast-api.ws-url}")
    private String fastApiWsUrl;

    public void sendToFastApi(WebSocketSession frontendSession, AiChatRequestDto payload, String activeSessionId) {
        String frontendWsId = frontendSession.getId();
        WebSocketSession fastApiSession = sessionMap.get(frontendWsId);

        try {
            if (fastApiSession != null && fastApiSession.isOpen()) {
                sendPayload(fastApiSession, payload);
            } else {
                connectAndSend(frontendSession, payload, activeSessionId);
            }
        } catch (Exception e) {
            log.error("FastAPI Guest Relay 처리 중 예외 발생", e);
        }
    }

    private void connectAndSend(WebSocketSession frontendSession, AiChatRequestDto payload, String activeSessionId) {
        WebSocketContainer container = ContainerProvider.getWebSocketContainer();
        StandardWebSocketClient client = new StandardWebSocketClient(container);

        GuestFastApiWebSocketHandler handler = new GuestFastApiWebSocketHandler(
            frontendSession, redisService, objectMapper, activeSessionId);

        client.execute(handler, fastApiWsUrl)
            .whenComplete((fastApiSession, throwable) -> {
                if (throwable != null) {
                    log.error("FastAPI 게스트 웹소켓 연결 실패", throwable);
                    return;
                }
                sessionMap.put(frontendSession.getId(), fastApiSession);
                sendPayload(fastApiSession, payload);
            });
    }

    private void sendPayload(WebSocketSession fastApiSession, AiChatRequestDto payload) {
        try {
            fastApiSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
        } catch (Exception e) {
            log.error("FastAPI 전송 실패", e);
        }
    }

    public void closeFastApiSession(String frontendWsId) {
        WebSocketSession fastApiSession = sessionMap.remove(frontendWsId);
        if (fastApiSession != null && fastApiSession.isOpen()) {
            try { fastApiSession.close(); } catch (Exception ignored) {}
        }
    }
}