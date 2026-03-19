package com.ssafy.ssarvis.chat.dto.response;

import com.ssafy.ssarvis.chat.document.ChatSessionDocument;
import com.ssafy.ssarvis.chat.domain.ChatMode;
import com.ssafy.ssarvis.chat.domain.ChatSessionStatus;
import com.ssafy.ssarvis.chat.domain.ChatSessionType;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import java.time.LocalDateTime;

public record ChatSessionResponseDto(
    String id,
    Long userId,
    Long assistantId,
    ChatMode chatMode,
    ChatSessionType chatSessionType,
    String title,
    ChatSessionStatus chatSessionStatus,
    Integer messageCount,
    LocalDateTime startedAt,
    LocalDateTime lastMessageAt,
    MemoryPolicy memoryPolicy,
    LocalDateTime expiredAt
) {

    public static ChatSessionResponseDto from(ChatSessionDocument chatSessionDocument) {
        return new ChatSessionResponseDto(
            chatSessionDocument.getId(),
            chatSessionDocument.getUserId(),
            chatSessionDocument.getAssistantId(),
            chatSessionDocument.getChatMode(),
            chatSessionDocument.getChatSessionType(),
            chatSessionDocument.getTitle(),
            chatSessionDocument.getChatSessionStatus(),
            chatSessionDocument.getMessageCount(),
            chatSessionDocument.getStartedAt(),
            chatSessionDocument.getLastMessageAt(),
            chatSessionDocument.getMemoryPolicy(),
            chatSessionDocument.getExpiresAt()
        );
    }
}
