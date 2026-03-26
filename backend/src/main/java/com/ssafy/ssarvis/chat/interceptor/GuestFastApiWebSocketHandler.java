package com.ssafy.ssarvis.chat.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.ssarvis.chat.dto.response.AiStreamMessageDto;
import com.ssafy.ssarvis.chat.service.GuestChatRedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

@Slf4j
@RequiredArgsConstructor
public class GuestFastApiWebSocketHandler extends AbstractWebSocketHandler { // 🌟 핵심 변경: Text... -> Abstract...

    private final WebSocketSession frontendSession;
    private final GuestChatRedisService redisService;
    private final ObjectMapper objectMapper;
    private final String activeSessionId;
    private final StringBuffer assistantFullText = new StringBuffer();

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        if (!frontendSession.isOpen()) return;

        String rawPayload = message.getPayload();

        // 텍스트 패킷은 가공 없이 즉시 프론트로
        frontendSession.sendMessage(new TextMessage(rawPayload));

        try {
            AiStreamMessageDto dto = objectMapper.readValue(rawPayload, AiStreamMessageDto.class);
            String type = dto.type() != null ? dto.type() : "unknown";

            switch (type) {
                case "text.start" -> handleTextStart(dto);
                case "text.end" -> handleTextEnd(dto);
                case "voice.start" -> handleVoiceStart(dto);
                case "voice.delta" -> handleVoiceDelta(dto);
                case "voice.end" -> handleVoiceEnd(dto);
                default -> log.debug("알 수 없는 게스트 FastAPI 텍스트 메시지 type={}", type);
            }
        } catch (Exception e) {
            log.warn("응답 청크 JSON 파싱 예외 발생 (무시됨)", e);
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        relayBinaryToFrontend(message);
    }

    private void relayBinaryToFrontend(BinaryMessage message) {
        if (frontendSession == null || !frontendSession.isOpen()) {
            return;
        }
        try {
            frontendSession.sendMessage(message); // 오디오 바이너리 즉시 통과 (Passthrough)
        } catch (Exception e) {
            log.error("프론트엔드로의 오디오 바이너리 릴레이 전송 실패. frontendSessionId={}", frontendSession.getId(), e);
        }
    }

    private void handleTextStart(AiStreamMessageDto dto) {}

    private void handleTextEnd(AiStreamMessageDto dto) {
        extractAndAppendText(dto);
    }

    private void handleVoiceStart(AiStreamMessageDto dto) {}

    private void handleVoiceDelta(AiStreamMessageDto dto) {
        extractAndAppendText(dto);
    }

    private void handleVoiceEnd(AiStreamMessageDto dto) {
        if (assistantFullText.length() > 0) {
            log.info("게스트 AI 응답 완료. Redis 임시 저장 완료.");
            redisService.appendHistory(activeSessionId, "ASSISTANT", assistantFullText.toString());
            assistantFullText.setLength(0);
        }
    }

    private void extractAndAppendText(AiStreamMessageDto dto) {
        if (dto.payload() != null && dto.payload().text() != null && !dto.payload().text().isBlank()) {
            assistantFullText.append(dto.payload().text());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info("Guest FastAPI mapped session closed for activeSessionId={}", activeSessionId);
    }
}