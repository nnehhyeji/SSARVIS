package com.ssafy.ssarvis.chat.dto.response;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.chat.document.ChatSessionDocument;
import com.ssafy.ssarvis.chat.domain.ChatSessionStatus;
import com.ssafy.ssarvis.chat.domain.ChatSessionType;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import java.time.LocalDateTime;

public record ChatSessionResponseDto(
    String id,
    Long userId,
    Long targetUserId,
    String targetUserCustomId,
    String targetUserProfileImageUrl,
    Long assistantId,
    AssistantType assistantType,
    ChatSessionType chatSessionType,
    String title,
    ChatSessionStatus chatSessionStatus,
    MemoryPolicy memoryPolicy,
    Integer messageCount,
    LocalDateTime startedAt,
    LocalDateTime lastMessageAt,
    LocalDateTime expiredAt
) {

    public static ChatSessionResponseDto from(ChatSessionDocument chatSessionDocument) {
        return new ChatSessionResponseDto(
            chatSessionDocument.getId(),
            chatSessionDocument.getUserId(),
            chatSessionDocument.getTargetUserId(),
            chatSessionDocument.getTargetUserCustomId(),
            chatSessionDocument.getTargetUserProfileImageUrl(),
            chatSessionDocument.getAssistantId(),
            chatSessionDocument.getAssistantType(),
            chatSessionDocument.getChatSessionType(),
            chatSessionDocument.getTitle(),
            chatSessionDocument.getChatSessionStatus(),
            chatSessionDocument.getMemoryPolicy(),
            chatSessionDocument.getMessageCount(),
            chatSessionDocument.getStartedAt(),
            chatSessionDocument.getLastMessageAt(),
            chatSessionDocument.getExpiredAt()
        );
    }
}