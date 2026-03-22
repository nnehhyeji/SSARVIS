package com.ssafy.ssarvis.chat.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.ssarvis.chat.dto.IncomingTurnContext;
import com.ssafy.ssarvis.chat.dto.request.ClientChatMessageDto;
import com.ssafy.ssarvis.chat.service.ChatStreamingService;
import com.ssafy.ssarvis.common.constant.Constants;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

/**
 * 서버 Heap 메모리에서 오디오 청크를 합친다면 OutOfMemory 우려 임시 파일 생성하여서 OS 디스크에 저장하는 방법 -> Tomcat의 파일 업로드 방식에서 차용
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AudioStreamingHandler extends AbstractWebSocketHandler {

    // 세션별 임시 파일과 스트림 관리
    private final IncomingTurnContextRegistry contextRegistry;
    private final ObjectMapper objectMapper;
    private final ChatStreamingService chatStreamingService;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info("새로운 웹소켓 연결: 세션ID = {}", session.getId());
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        IncomingTurnContext context = contextRegistry.get(session.getId());

        if (context == null) {
            log.warn("진행 중인 턴 컨텍스트가 없습니다. wsSessionId={}", session.getId());
            return;
        }

        BufferedOutputStream bos = context.getInputAudioBos();
        if (bos == null) {
            log.warn("입력 오디오 스트림이 없습니다. wsSessionId={}", session.getId());
            return;
        }

        bos.write(message.getPayload().array());
        log.debug("오디오 청크 수신. wsSessionId={}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        ClientChatMessageDto dto = objectMapper.readValue(message.getPayload(), ClientChatMessageDto.class);

        switch (dto.type()) {
            case "CHAT_START" -> handleChatStart(session, dto);
            case "AUDIO_END" -> handleAudioEnd(session);
            case "TEXT" -> handleText(session, dto);
            case "CANCEL" -> handleCancel(session);
            default -> {
                log.warn("지원하지 않는 메시지 타입. wsSessionId={}, type={}", session.getId(), dto.type());
                sendMessage(session, """
                    {"type":"ERROR","message":"지원하지 않는 메시지 타입입니다."}
                    """);
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info("웹소켓 연결 종료. wsSessionId={}, status={}", session.getId(), status);
        cleanUp(session.getId());
    }

    private void handleChatStart(WebSocketSession session, ClientChatMessageDto dto) throws IOException {
        Long userId = (Long) session.getAttributes().get("userId");
        if (userId == null) {
            throw new IllegalStateException("인증된 사용자 정보가 없습니다.");
        }

        cleanUp(session.getId());

        File tempFile = File.createTempFile(String.format(Constants.USER_TEMP_FILE_PREFIX, session.getId()), Constants.AUDIO_FILE_EXTENSION);
        BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(tempFile));

        IncomingTurnContext context = IncomingTurnContext.builder()
            .sessionId(dto.sessionId())
            .userId(userId)
            .assistantType(dto.assistantType())
            .memoryPolicy(dto.memoryPolicy())
            .inputAudioTempFile(tempFile)
            .inputAudioBos(bos)
            .audioEnded(false)
            .build();

        contextRegistry.put(session.getId(), context);

        log.info("CHAT_START wsSessionId={}, userId={}, sessionId={}, assistantType={}, memoryPolicy={}",
            session.getId(), userId, dto.sessionId(), dto.assistantType(), dto.memoryPolicy());

        sendMessage(session, """
            {"type":"ACK","message":"CHAT_START 처리 완료"}
            """);
    }

    private void handleAudioEnd(WebSocketSession session) throws IOException {
        IncomingTurnContext context = contextRegistry.get(session.getId());
        if (context == null) {
            log.warn("AUDIO_END 수신했지만 컨텍스트가 없습니다. wsSessionId={}", session.getId());
            return;
        }

        BufferedOutputStream bos = context.getInputAudioBos();
        if (bos != null) {
            bos.flush();
            bos.close();
            context.clearAudioBuffer();
        }

        context.endAudio(true);

        log.info("AUDIO_END 수신. wsSessionId={}, tempFile={}",
            session.getId(),
            context.getInputAudioTempFile() != null ? context.getInputAudioTempFile().getAbsolutePath() : null
        );

        sendMessage(session, """
            {"type":"ACK","message":"AUDIO_END 처리 완료"}
            """);
    }

    private void handleText(WebSocketSession session, ClientChatMessageDto dto) throws Exception {
        IncomingTurnContext context = contextRegistry.get(session.getId());
        if (context == null) {
            log.warn("TEXT 수신했지만 컨텍스트가 없습니다. wsSessionId={}", session.getId());
            return;
        }

        if (!context.isAudioEnded()) {
            log.warn("AUDIO_END 이전에 TEXT가 도착했습니다. wsSessionId={}", session.getId());
            sendMessage(session, """
                {"type":"ERROR","message":"AUDIO_END 이후에 TEXT를 보내야 합니다."}
                """);
            return;
        }

        if (!StringUtils.hasText(dto.text())) {
            sendMessage(session, """
                {"type":"ERROR","message":"TEXT 값이 비어 있습니다."}
                """
            );
            return;
        }

        context.updateFinalText(dto.text());

        log.info("TEXT 수신 완료. wsSessionId={}, text={}", session.getId(), dto.text());

        chatStreamingService.completeUserInput(
            session,
            context.getUserId(),
            context.getSessionId(),
            context.getAssistantType(),
            context.getMemoryPolicy(),
            context.getInputAudioTempFile(),
            dto.text()
        );

        sendMessage(session,
            """
            {"type":"ACK","message":"TEXT 처리 완료"}
            """);

        contextRegistry.remove(session.getId());
    }

    private void handleCancel(WebSocketSession session) throws IOException {
        log.info("CANCEL 수신. wsSessionId={}", session.getId());
        cleanUp(session.getId());

        session.sendMessage(new TextMessage("""
            {"type":"CANCELLED","message":"현재 턴이 취소되었습니다."}
            """));
    }

    private void cleanUp(String webSocketSessionId) {
        IncomingTurnContext context = contextRegistry.get(webSocketSessionId);
        if (context == null) {
            return;
        }

        BufferedOutputStream bos = context.getInputAudioBos();
        if (bos != null) {
            try {
                bos.close();
            } catch (IOException ignored) {
            }
        }

        File tempFile = context.getInputAudioTempFile();
        if (tempFile != null) {
            try {
                Files.deleteIfExists(tempFile.toPath());
            } catch (IOException e) {
                log.error("임시 파일 삭제 실패. path={}", tempFile.getAbsolutePath(), e);
            }
        }

        contextRegistry.remove(webSocketSessionId);
    }

    private void sendMessage(WebSocketSession session, String message) throws IOException {
        session.sendMessage(new TextMessage(message));
    }
}