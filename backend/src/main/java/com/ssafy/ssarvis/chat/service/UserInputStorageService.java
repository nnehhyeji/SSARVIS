package com.ssafy.ssarvis.chat.service;

import com.ssafy.ssarvis.chat.domain.AudioMeta;
import com.ssafy.ssarvis.chat.dto.request.ChatUserMessageCreateRequestDto;
import com.ssafy.ssarvis.common.constant.Constants;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserInputStorageService {

    private final AudioStorageService audioStorageService;
    private final ChatMessageService chatMessageService;

    @Async
    public void saveUserInputAsync(
        String sessionId,
        Long userId,
        File inputAudioTempFile,
        String finalText
    ) {
        try {
            AudioMeta audioMeta = null;
            if ((inputAudioTempFile != null) && (inputAudioTempFile.exists()) && (
                inputAudioTempFile.length() > 0)) {
                audioMeta = audioStorageService.uploadUserInputAudio(sessionId, userId,
                    inputAudioTempFile,
                    Constants.AUDIO_CONTENT_TYPE);
            }

            chatMessageService.saveUserMessage(userId,
                new ChatUserMessageCreateRequestDto(sessionId, finalText, audioMeta));
        } catch (Exception e) {
            log.error("유저 입력 비동기 저장 실패. sessionId = {}, userId = {}", sessionId, userId, e);
        } finally {
                deleteTempFile(inputAudioTempFile);
        }
    }
    private void deleteTempFile(File file) {
        if (file == null) {
            return;
        }

        try {
            Files.deleteIfExists(file.toPath());
        } catch (IOException e) {
            log.error("유저 요청 임시 파일 삭제 실패. path={}", file.getAbsolutePath(), e);
        }
    }
}
