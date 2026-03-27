package com.ssafy.ssarvis.chat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.ssarvis.chat.dto.request.AiChatRequestDto;
import com.ssafy.ssarvis.chat.interceptor.FastApiWebSocketHandler;
import jakarta.websocket.ContainerProvider;
import jakarta.websocket.WebSocketContainer;
import java.util.Map;
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
public class AiRequestRelayService {

    private final ConcurrentHashMap<String, WebSocketSession> sessionMap = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final AiOutputStorageService aiOutputStorageService;

    @Value("${app.fast-api.ws-url}")
    private String fastApiWsUrl;

    public void send(WebSocketSession frontendSession, AiChatRequestDto aiChatRequestDto) {
        String frontendSessionId = frontendSession.getId();
        WebSocketSession fastApiSession = sessionMap.get(frontendSessionId);

        try {
            if (fastApiSession != null && fastApiSession.isOpen()) {
                // 이미 연결되어 있다면 기존 세션을 재활용하여 전송
                log.info("FastAPI 기존 세션 재활용 전송. frontendSessionId={}", frontendSessionId);
                sendPayloadToFastApi(frontendSession, fastApiSession, aiChatRequestDto);
            } else {
                // 연결이 없거나 닫혀있다면 새로 맺고 전송
                log.info("FastAPI 새로운 세션 연결 및 전송. frontendSessionId={}", frontendSessionId);
                FastApiWebSocketHandler handler = createFastApiHandler(frontendSession, aiChatRequestDto);
                connectAndSend(frontendSession, handler, aiChatRequestDto);
            }
        } catch (Exception e) {
            log.error("FastAPI 릴레이 처리 중 예외 발생. sessionId={}", aiChatRequestDto.sessionId(), e);
            notifyFrontendError(frontendSession, "FASTAPI_RELAY_FAILED");
        }
    }

    private FastApiWebSocketHandler createFastApiHandler(
        WebSocketSession frontendSession,
        AiChatRequestDto payload
    ) {
        return new FastApiWebSocketHandler(
            frontendSession,
            aiOutputStorageService,
            objectMapper,
            payload.sessionId(),
            payload.userId()
        );
    }

    private void connectAndSend(
        WebSocketSession frontendSession,
        FastApiWebSocketHandler handler,
        AiChatRequestDto payload
    ) {
        WebSocketContainer container = ContainerProvider.getWebSocketContainer();

        container.setDefaultMaxBinaryMessageBufferSize(1024 * 1024);
        container.setDefaultMaxTextMessageBufferSize(1024 * 1024);

        StandardWebSocketClient client = new StandardWebSocketClient(container);

        client.execute(handler, fastApiWsUrl)
            .whenComplete((fastApiSession, throwable) -> {
                if (throwable != null) {
                    handleConnectFailure(frontendSession, payload.sessionId(), throwable);
                    return;
                }

                sendPayloadToFastApi(frontendSession, fastApiSession, payload);
            });
    }

    public void closeFastApiSession(String frontendSessionId) {
        WebSocketSession fastApiSession = sessionMap.remove(frontendSessionId);
        if (fastApiSession != null) {
            log.info("프론트 소켓 종료에 따른 연관 FastAPI 세션 해제. frontendSessionId={}", frontendSessionId);
            safeClose(fastApiSession);
        }
    }

    private void handleConnectFailure(
        WebSocketSession frontendSession,
        String sessionId,
        Throwable throwable
    ) {
        log.error("FastAPI 웹소켓 연결 실패. sessionId={}", sessionId, throwable);
        notifyFrontendError(frontendSession, "FASTAPI_CONNECT_FAILED");
    }

    private void sendPayloadToFastApi(
        WebSocketSession frontendSession,
        WebSocketSession fastApiSession,
        AiChatRequestDto payload
    ) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(payload);
            fastApiSession.sendMessage(new TextMessage(jsonPayload));

            log.info("FastAPI 요청 전송 완료. sessionId={}, userId={}",
                payload.sessionId(), payload.userId());
        } catch (Exception e) {
            log.error("FastAPI 요청 전송 실패. sessionId={}", payload.sessionId(), e);
            notifyFrontendError(frontendSession, "FASTAPI_SEND_FAILED");
            safeClose(fastApiSession);
        }
    }

    private void notifyFrontendError(WebSocketSession frontendSession, String errorCode) {
        if (frontendSession == null || !frontendSession.isOpen()) {
            return;
        }

        try {
            String body = objectMapper.writeValueAsString(
                Map.of("type", "ERROR", "code", errorCode)
            );
            frontendSession.sendMessage(new TextMessage(body));
        } catch (JsonProcessingException e) {
            log.error("프론트 오류 메시지 직렬화 실패", e);
        } catch (Exception e) {
            log.error("프론트 오류 메시지 전송 실패", e);
        }
    }

    private void safeClose(WebSocketSession session) {
        if (session == null) {
            return;
        }

        try {
            if (session.isOpen()) {
                session.close();
            }
        } catch (Exception e) {
            log.warn("FastAPI 세션 종료 중 예외", e);
        }
    }
}