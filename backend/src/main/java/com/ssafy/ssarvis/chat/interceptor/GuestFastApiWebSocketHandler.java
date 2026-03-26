package com.ssafy.ssarvis.chat.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.ssarvis.chat.service.GuestChatRedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Slf4j
@RequiredArgsConstructor
public class GuestFastApiWebSocketHandler extends TextWebSocketHandler {

    private final WebSocketSession frontendSession;
    private final GuestChatRedisService redisService;
    private final ObjectMapper objectMapper;
    private final String activeSessionId;

    // 스트리밍 턴 동안 내려온 유효 AI Text를 모으기 위한 임시 버퍼
    private final StringBuffer assistantFullText = new StringBuffer();
    // 청크 파싱용 내부 레코드 (필요 필드만 선택적 매핑)
    public record FastApiChunkDto(String type, String text) {}

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        if (!frontendSession.isOpen()) return;

        String payload = message.getPayload();

        // Chunk 스트림을 즉시 프론트로 전달
        frontendSession.sendMessage(new TextMessage(payload));

        try {
            FastApiChunkDto dto = objectMapper.readValue(payload, FastApiChunkDto.class);
            String type = dto.type() != null ? dto.type() : "unknown";

            // FastAPI의 이벤트 타입별 내부 private 메서드로 스위칭 위임
            switch (type) {
                case "text.start" -> handleTextStart(dto);
                case "text.end" -> handleTextEnd(dto);
                case "voice.start" -> handleVoiceStart(dto);
                case "voice.delta" -> handleVoiceDelta(dto);
                case "voice.end" -> handleVoiceEnd(dto);
                default -> log.debug("알 수 없는 게스트 FastAPI 메시지 type={}", type);
            }
        } catch (Exception e) {
            log.warn("응답 청크 JSON 파싱 예외 발생 (무시됨)", e);
        }
    }

    private void handleTextStart(FastApiChunkDto dto) {
        // 텍스트 스트리밍 시작 시그널: 즉각 통과 후 별도로 메모리에 캐싱할 동작 없음
    }

    private void handleTextEnd(FastApiChunkDto dto) {
        // 텍스트 스트리밍 종료 시점: 포함된 잔여 텍스트가 있다면 버퍼에 누적 보관
        if (dto.text() != null && !dto.text().isBlank()) {
            assistantFullText.append(dto.text());
        }
    }

    private void handleVoiceStart(FastApiChunkDto dto) {
        // 오디오 스트리밍 시작 시그널: 처리 로직 없음
    }

    private void handleVoiceDelta(FastApiChunkDto dto) {
        // 음성 델타 패킷: 텍스트가 같이 떨어질 경우(선택적), 텍스트 존재 시 버퍼에 즉각 적재
        if (dto.text() != null && !dto.text().isBlank()) {
            assistantFullText.append(dto.text());
        }
    }

    private void handleVoiceEnd(FastApiChunkDto dto) {
        // 발화 턴(Turn) 완료 시그널: 완성된 단일 문장을 Redis에 기록 후 버퍼 초기화
        if (assistantFullText.length() > 0) {
            redisService.appendHistory(activeSessionId, "ASSISTANT", assistantFullText.toString());
            assistantFullText.setLength(0); // 다음 질문 턴을 위해 버퍼를 0으로 리셋
        }

        // 프론트엔드에서 요구하는 VOICE_END 트리거 동작이 필요하다면 이곳 또는 Passthrough로 자동 처리됨
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info("Guest FastAPI mapped session closed for activeSessionId={}", activeSessionId);
    }
}