package com.ssafy.ssarvis.chat.service;

import com.ssafy.ssarvis.chat.domain.AudioMeta;
import com.ssafy.ssarvis.chat.dto.response.ChatMessageResponseDto;
import com.ssafy.ssarvis.common.constant.Constants;
import java.io.File;
import java.nio.file.Files;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiOutputStorageService {

    private final AudioStorageService audioStorageService;
    private final ChatMessageService chatMessageService;

    @Async
    public void saveAiOutputAsync(String sessionId, Long userId, String aiText, File aiAudioTempFile) {
        ChatMessageResponseDto assistantMessage = null;
        try {
            log.info("AI 응답 비동기 저장 시작 - sessionId={}, userId={}, textLength={}, fileSize={} bytes",
                sessionId,
                userId,
                aiText != null ? aiText.length() : 0,
                (aiAudioTempFile != null && aiAudioTempFile.exists()) ? aiAudioTempFile.length() : 0
            );

            assistantMessage = chatMessageService.createAssistantMessage(sessionId, aiText);
            String messageId = assistantMessage.id();

            AudioMeta audioMeta = null;
            if (hasValidAudioFile(aiAudioTempFile)) {
                audioMeta = audioStorageService.uploadAssistantAudio(
                    sessionId,
                    messageId,
                    aiAudioTempFile,
                    Constants.AUDIO_CONTENT_TYPE
                );
                log.info("S3 업로드 완료 - sessionId={}, messageId={}, url={}",
                    sessionId, messageId, audioMeta.getAudioUrl());
            }

            chatMessageService.completeAssistantMessage(messageId, audioMeta);
            log.info("AI 응답 저장 완료 - sessionId={}, messageId={}, hasAudio={}",
                sessionId, messageId, audioMeta != null);

        } catch (Exception e) {
            log.error("AI 응답 저장 실패 - sessionId={}, userId={}", sessionId, userId, e);

            if (assistantMessage != null) {
                try {
                    chatMessageService.failAssistantMessage(assistantMessage.id());
                } catch (Exception failEx) {
                    log.error("AI 메시지 FAILED 처리 실패 - messageId={}", assistantMessage.id(), failEx);
                }
            }

        } finally {
            deleteTempFile(aiAudioTempFile);
        }
    }

    private boolean hasValidAudioFile(File file) {
        return file != null && file.exists() && file.length() > 0;
    }

    private void deleteTempFile(File file) {
        if (file == null) {
            return;
        }
        try {
            Files.deleteIfExists(file.toPath());
            log.debug("임시 파일 삭제 완료 - {}", file.getAbsolutePath());
        } catch (Exception e) {
            log.error("임시 파일 삭제 실패 - {}", file.getAbsolutePath(), e);
        }
    }
}