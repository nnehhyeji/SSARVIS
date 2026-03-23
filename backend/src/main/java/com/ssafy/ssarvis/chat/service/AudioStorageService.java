package com.ssafy.ssarvis.chat.service;

import com.ssafy.ssarvis.chat.domain.AudioMeta;
import java.io.File;

public interface AudioStorageService {

    AudioMeta uploadUserInputAudio(String sessionId, Long userId, File file, String contentType);

    AudioMeta uploadAssistantAudio(String sessionId, String messageId, File file,
        String contentType);
}
