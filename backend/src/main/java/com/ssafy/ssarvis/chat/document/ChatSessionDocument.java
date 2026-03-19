package com.ssafy.ssarvis.chat.document;

import com.ssafy.ssarvis.chat.domain.ChatMode;
import com.ssafy.ssarvis.chat.domain.ChatSessionStatus;
import com.ssafy.ssarvis.chat.domain.ChatSessionType;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "chat_sessions")
@CompoundIndexes({
    @CompoundIndex(
        name = "user_mode_policy_status_idx",
        def = "{'userId': 1, 'mode': 1, 'memoryPolicy': 1, 'status': 1}"
    ),
    @CompoundIndex(
        name = "user_mode_last_message_idx",
        def = "{'userId': 1, 'mode': 1, 'lastMessageAt': -1}"
    )
})
public class ChatSessionDocument {

    @Id
    private String id;

    @Indexed
    private Long userId;

    private Long assistantId;

    @Indexed
    // NORMAL, COUNSELING, STUDY
    private ChatMode chatMode;

    // USER_AI, AVATAR_AI
    private ChatSessionType chatSessionType;

    private String title;

    // ACTIVE, ENDED
    @Indexed
    private ChatSessionStatus chatSessionStatus;

    // PUBLIC, PRIVATE
    private MemoryPolicy memoryPolicy;

    private Integer messageCount;

    private LocalDateTime startedAt;

    @Indexed
    private LocalDateTime lastMessageAt;

    private LocalDateTime expiredAt;

    public static ChatSessionDocument create(
        Long userId, Long assistantId, ChatMode chatMode,
        ChatSessionType chatSessionType, String title,
        MemoryPolicy memoryPolicy, LocalDateTime now, LocalDateTime expiredAt
    ) {
        return ChatSessionDocument.builder()
            .userId(userId)
            .assistantId(assistantId)
            .chatMode(chatMode)
            .chatSessionType(chatSessionType)
            .title(title)
            .memoryPolicy(memoryPolicy)
            .chatSessionStatus(ChatSessionStatus.ACTIVE)
            .messageCount(0)
            .startedAt(now)
            .lastMessageAt(now)
            .expiredAt(expiredAt)
            .build();
    }

    public void end() {
        this.chatSessionStatus = ChatSessionStatus.ENDED;
    }

    public void timeout() {
        this.chatSessionStatus = ChatSessionStatus.TIMEOUT;
    }

    public void touch(LocalDateTime now, LocalDateTime expiredAt) {
        this.lastMessageAt = now;
        this.expiredAt = expiredAt;
    }

    public void increaseMessageCount(LocalDateTime now, LocalDateTime expiredAt) {
        this.messageCount = this.messageCount + 1;
        this.lastMessageAt = now;
        this.expiredAt = expiredAt;
    }
}