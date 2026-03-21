package com.ssafy.ssarvis.chat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.ssarvis.chat.dto.request.AiChatRequestDto;
import com.ssafy.ssarvis.chat.interceptor.FastApiWebSocketHandler;
import java.util.Map;
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

    private final ObjectMapper objectMapper;
    private final AiOutputStorageService aiOutputStorageService;

    @Value("${app.fast-api.ws-url}")
    private String fastApiWsUrl;

    public void send(WebSocketSession frontendSession, AiChatRequestDto aiChatRequestDto) {
        try {
            FastApiWebSocketHandler handler = createFastApiHandler(frontendSession, aiChatRequestDto);
            connectAndSend(frontendSession, handler, aiChatRequestDto);
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
        StandardWebSocketClient client = new StandardWebSocketClient();

        client.execute(handler, fastApiWsUrl)
            .whenComplete((fastApiSession, throwable) -> {
                if (throwable != null) {
                    handleConnectFailure(frontendSession, payload.sessionId(), throwable);
                    return;
                }

                sendPayloadToFastApi(frontendSession, fastApiSession, payload);
            });
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