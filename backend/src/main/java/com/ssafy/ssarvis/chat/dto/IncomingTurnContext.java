package com.ssafy.ssarvis.chat.dto;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.chat.domain.ChatSessionType;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import java.io.BufferedOutputStream;
import java.io.File;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class IncomingTurnContext {
    private String sessionId;
    private Long userId;
    private Long targetUserId;
    private Long assistantId;
    private ChatSessionType chatSessionType;
    private AssistantType assistantType;
    private MemoryPolicy memoryPolicy;

    private File inputAudioTempFile;
    private BufferedOutputStream inputAudioBos;
    private String finalText;
    private boolean audioEnded;

    public void clearAudioBuffer() {
        this.inputAudioBos = null;
    }

    public void updateFinalText(String finalText) {
        this.finalText = finalText;
    }

    public void endAudio(boolean isEnd) {
        this.audioEnded = isEnd;
    }
}
