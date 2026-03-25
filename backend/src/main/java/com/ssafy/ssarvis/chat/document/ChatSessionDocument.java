package com.ssafy.ssarvis.chat.document;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
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
import org.springframework.data.mongodb.core.mapping.Field;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "chat_sessions")
@CompoundIndexes({
    @CompoundIndex(
        name = "user_chat_mode_memory_policy_chat_session_status_idx",
        def = "{'user_id': 1, 'assistant_type': 1, 'memory_policy': 1, 'chat_session_status': 1}"
    ),
    @CompoundIndex(
        name = "user_mode_last_message_idx",
        def = "{'userId': 1, 'assistant_type': 1, 'last_message_at': -1}"
    )
})
public class ChatSessionDocument {

    @Id
    private String id;

    @Indexed
    @Field("user_id")
    private Long userId;

    @Indexed
    @Field("target_user_id")
    private Long targetUserId;

    @Field("target_user_custom_id")
    private String targetUserCustomId;

    private String targetUserProfileImageUrl;

    @Field("assistant_id")
    private Long assistantId;

    @Indexed
    @Field("assistant_type")
    // DAILY, STUDY, COUNSEL, PERSONA
    private AssistantType assistantType;

    // USER_AI, AVATAR_AI, AI_AI
    private ChatSessionType chatSessionType;

    private String title;

    // ACTIVE, ENDED
    @Indexed
    @Field("chat_session_status")
    private ChatSessionStatus chatSessionStatus;

    // GENERAL, SECRET
    @Field("memory_policy")
    private MemoryPolicy memoryPolicy;

    @Field("message_count")
    private Integer messageCount;

    @Field("started_at")
    private LocalDateTime startedAt;

    @Indexed
    @Field("last_message_at")
    private LocalDateTime lastMessageAt;

    @Field("expired_at")
    private LocalDateTime expiredAt;

    public static ChatSessionDocument create(
        Long userId, Long targetUserId, String targetUserCustomId, String targetUserProfileImageUrl, Long assistantId, AssistantType assistantType,
        ChatSessionType chatSessionType, String title,
        MemoryPolicy memoryPolicy, LocalDateTime now, LocalDateTime expiredAt
    ) {
        return ChatSessionDocument.builder()
            .userId(userId)
            .targetUserId(targetUserId != null ? targetUserId : userId)
            .targetUserCustomId(targetUserCustomId)
            .targetUserProfileImageUrl(targetUserProfileImageUrl)
            .assistantId(assistantId)
            .assistantType(assistantType)
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

    public void updateSessionState(LocalDateTime now, LocalDateTime expiredAt, String text) {
        this.messageCount = this.messageCount + 1;
        this.lastMessageAt = now;
        this.expiredAt = expiredAt;

        if (text != null && !text.isBlank()) {
            this.title = text.length() > 50 ? text.substring(0, 50) + "..." : text;
        }
    }
}