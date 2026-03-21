package com.ssafy.ssarvis.chat.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.ssarvis.chat.dto.response.AiStreamMessageDto;
import com.ssafy.ssarvis.chat.service.AiOutputStorageService;
import com.ssafy.ssarvis.common.constant.Constants;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

@Slf4j
public class FastApiWebSocketHandler extends AbstractWebSocketHandler {

    private final WebSocketSession frontendSession;
    private final AiOutputStorageService aiOutputStorageService;
    private final ObjectMapper objectMapper;
    private final String sessionId;
    private final Long userId;

    private final StringBuilder aiTextBuilder = new StringBuilder();

    private File aiAudioTempFile;
    private BufferedOutputStream bos;

    private boolean voiceStarted = false;
    private boolean voiceEnded = false;
    private boolean finalBinaryExist = false;

    public FastApiWebSocketHandler(
        WebSocketSession frontendSession,
        AiOutputStorageService aiOutputStorageService,
        ObjectMapper objectMapper,
        String sessionId,
        Long userId
    ) {
        this.frontendSession = frontendSession;
        this.aiOutputStorageService = aiOutputStorageService;
        this.objectMapper = objectMapper;
        this.sessionId = sessionId;
        this.userId = userId;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info("FastAPI 웹소켓 연결 완료. fastApiSessionId={}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        AiStreamMessageDto dto = objectMapper.readValue(
            message.getPayload(),
            AiStreamMessageDto.class
        );
        log.info(dto.toString());

        switch (dto.type()) {
            case "text.start" -> handleTextStart(dto);
            case "text.end" -> handleTextEnd(dto);
            case "voice.start" -> handleVoiceStart(dto);
            case "voice.delta" -> handleVoiceDelta(dto); // 추가된 부분
            case "voice.end" -> handleVoiceEnd(dto);
            default -> log.warn("알 수 없는 FastAPI 메시지 type={}", dto.type());
        }

        relayTextToFrontend(message);
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        relayBinaryToFrontend(message);
//        appendAudioChunk(message);

        if (this.finalBinaryExist) {
            appendAudioChunk(message);
            finishAndSaveAiOutput();
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("FastAPI 웹소켓 transport error. fastApiSessionId={}", session.getId(), exception);
        notifyFrontendError("FASTAPI_STREAM_ERROR");
        cleanupTempResources();
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info("FastAPI 스트리밍 종료. fastApiSessionId={}, status={}", session.getId(), status);

        if (!voiceEnded && (aiAudioTempFile != null || !aiTextBuilder.isEmpty())) {
            log.warn("voice.end 수신 전 연결 종료. fallback 저장 시도. sessionId={}", sessionId);
            closeAudioStream();
            String finalAiText = aiTextBuilder.toString();
            aiOutputStorageService.saveAiOutputAsync(sessionId, userId, finalAiText, aiAudioTempFile);
        }

        notifyFrontendEndOfStream();
    }

    private void handleTextStart(AiStreamMessageDto dto) {
        log.info("FastAPI text.start sessionId={}", dto.sessionId());
    }

    private void handleTextEnd(AiStreamMessageDto dto) {
        String text = dto.payload() != null ? dto.payload().text() : null;
        if (text != null && !text.isBlank()) {
            aiTextBuilder.append(text);
        }
        log.info("FastAPI text.end sessionId={}, textLength={}", dto.sessionId(), text != null ? text.length() : 0);
    }

    private void handleVoiceDelta(AiStreamMessageDto dto) {
        String mimeType = dto.payload() != null ? dto.payload().mimeType() : null;
        log.debug("FastAPI voice.delta 수신. sessionId={}, sequence={}, mimeType={}",
            dto.sessionId(), dto.sequence(), mimeType);
    }

    private void handleVoiceStart(AiStreamMessageDto dto) {
        voiceStarted = true;

        try {
            aiAudioTempFile = File.createTempFile(Constants.AI_TEMP_FILE_PREFIX, Constants.AUDIO_FILE_EXTENSION);
            bos = new BufferedOutputStream(new FileOutputStream(aiAudioTempFile));
            log.info("AI 오디오 임시파일 생성. path={}", aiAudioTempFile.getAbsolutePath());
        } catch (IOException e) {
            log.error("AI 오디오 임시파일 생성 실패", e);
        }
    }

    private void handleVoiceEnd(AiStreamMessageDto dto) {
        voiceEnded = true;
        log.info("FastAPI voice.end sessionId={}, sequence={}", dto.sessionId(), dto.sequence());
        this.finalBinaryExist = true;
//        // 임시 오디오 파일 완성
//        closeAudioStream();
//
//        String finalText = aiTextBuilder.toString();
//        aiOutputStorageService.saveAiOutputAsync(sessionId, userId, finalText, aiAudioTempFile);
//
//        resetTurnState();
    }

    private void finishAndSaveAiOutput() {
        this.voiceEnded = true;
        // 임시 오디오 파일 스트림 쓰기 종료
        closeAudioStream();
        String finalText = aiTextBuilder.toString();

        // 비동기 S3/Mongo 저장
        aiOutputStorageService.saveAiOutputAsync(sessionId, userId, finalText, aiAudioTempFile);

        // 내부 상태 초기화
        resetTurnState();
    }

    private void relayTextToFrontend(TextMessage message) {
        if (frontendSession == null || !frontendSession.isOpen()) {
            return;
        }

        try {
            frontendSession.sendMessage(message);
        } catch (Exception e) {
            log.error("프론트 텍스트 릴레이 실패. frontendSessionId={}", frontendSession.getId(), e);
        }
    }

    private void relayBinaryToFrontend(BinaryMessage message) {
        if (frontendSession == null || !frontendSession.isOpen()) {
            return;
        }

        try {
            frontendSession.sendMessage(message);
        } catch (Exception e) {
            log.error("프론트 오디오 릴레이 실패. frontendSessionId={}", frontendSession.getId(), e);
        }
    }

    private void appendAudioChunk(BinaryMessage message) {
        if (!voiceStarted || bos == null) {
            log.warn("voice.start 이전이거나 응답 오디오 스트림이 없습니다.");
            return;
        }

        try {
            byte[] bytes = new byte[message.getPayload().remaining()];
            message.getPayload().get(bytes);
            bos.write(bytes);
        } catch (IOException e) {
            log.error("응답 오디오 임시 파일 기록 실패", e);
        }
    }

    private void closeAudioStream() {
        if (bos == null) {
            return;
        }

        try {
            bos.flush();
            bos.close();
        } catch (IOException e) {
            log.error("응답 오디오 스트림 종료 실패", e);
        } finally {
            bos = null;
        }
    }

    private void notifyFrontendError(String errorCode) {
        if (frontendSession == null || !frontendSession.isOpen()) {
            return;
        }

        try {
            frontendSession.sendMessage(new TextMessage(
                "{\"type\":\"ERROR\",\"code\":\"" + errorCode + "\"}"
            ));
        } catch (Exception e) {
            log.error("프론트 오류 메시지 전송 실패", e);
        }
    }

    private void notifyFrontendEndOfStream() {
        if (frontendSession == null || !frontendSession.isOpen()) {
            return;
        }

        try {
            frontendSession.sendMessage(new TextMessage("{\"type\":\"END_OF_STREAM\"}"));
        } catch (Exception e) {
            log.error("END_OF_STREAM 전송 실패", e);
        }
    }

    private void cleanupTempResources() {
        closeAudioStream();
        deleteTempFile();
    }

    private void deleteTempFile() {
        if (aiAudioTempFile == null) {
            return;
        }

        try {
            Files.deleteIfExists(aiAudioTempFile.toPath());
        } catch (IOException e) {
            log.error("AI 응답 임시 파일 삭제 실패. path={}", aiAudioTempFile.getAbsolutePath(), e);
        }
    }

    private void resetTurnState() {
        aiTextBuilder.setLength(0);
        aiAudioTempFile = null;
        bos = null;
        voiceStarted = false;
        voiceEnded = false;
        finalBinaryExist = false;
        log.debug("턴 상태 초기화 완료. sessionId={}", sessionId);
    }
}