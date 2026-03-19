package com.ssafy.ssarvis.chat.dto.response;

import com.ssafy.ssarvis.chat.document.ChatMessageDocument;
import com.ssafy.ssarvis.chat.domain.AudioMeta;
import com.ssafy.ssarvis.chat.domain.ChatMessageStatus;
import com.ssafy.ssarvis.chat.domain.ChatMode;
import com.ssafy.ssarvis.chat.domain.SpeakerType;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
public record ChatMessageResponseDto(
    String id,
    String sessionId,
    Long userId,
    Long assistantId,
    ChatMode chatMode,
    SpeakerType speakerType,
    Long speakerId,
    String text,
    ChatMessageStatus chatMessageStatus,
    AudioMeta audio,
    LocalDateTime createdAt
) {
    public static ChatMessageResponseDto from(ChatMessageDocument document) {
        return ChatMessageResponseDto.builder()
            .id(document.getId())
            .sessionId(document.getSessionId())
            .userId(document.getUserId())
            .assistantId(document.getAssistantId())
            .chatMode(document.getChatMode())
            .speakerType(document.getSpeakerType())
            .speakerId(document.getSpeakerId())
            .text(document.getText())
            .chatMessageStatus(document.getChatMessageStatus())
            .audio(document.getAudio())
            .createdAt(document.getCreatedAt())
            .build();
    }
}