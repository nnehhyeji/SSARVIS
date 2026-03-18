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
    private ChatMode mode;

    // USER_AI, AVATAR_AI
    private ChatSessionType chatSessionType;

    private String title;

    // ACTIVE, ENDED
    @Indexed
    private ChatSessionStatus status;

    // PUBLIC, PRIVATE
    private MemoryPolicy memoryPolicy;

    private Integer messageCount;

    private LocalDateTime startedAt;

    @Indexed
    private LocalDateTime lastMessageAt;

    private LocalDateTime expiresAt;
}