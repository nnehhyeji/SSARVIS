package com.ssafy.ssarvis.chat.service.impl;

import com.ssafy.ssarvis.chat.domain.AudioMeta;
import com.ssafy.ssarvis.chat.service.AudioStorageService;
import com.ssafy.ssarvis.common.constant.Constants;
import com.ssafy.ssarvis.common.service.S3Uploader;
import java.io.File;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudioStorageServiceImpl implements AudioStorageService {

    private final S3Uploader s3Uploader;

    @Override
    public AudioMeta uploadUserInputAudio(String sessionId, Long userId, File file,
        String contentType) {
        String directory = String.format(Constants.S3_USER_INPUT_AUDIO_DIRECTORY, userId,
            sessionId);
        String url = s3Uploader.uploadFile(file, directory, contentType);

        return AudioMeta.builder()
            .audioUrl(url)
            .contentType(contentType)
            .fileName(file.getName())
            .fileSize(file.length())
            .build();
    }

    @Override
    public AudioMeta uploadAssistantAudio(String sessionId, String messageId, File file,
        String contentType) {
        String directory = String.format(Constants.S3_ASSISTANT_INPUT_AUDIO_DIRECTORY, sessionId, messageId);
        String url = s3Uploader.uploadFile(file, directory, contentType);

        return AudioMeta.builder()
            .audioUrl(url)
            .contentType(contentType)
            .fileName(file.getName())
            .fileSize(file.length())
            .build();
    }
}
