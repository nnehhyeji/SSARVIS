package com.ssafy.ssarvis.chat.document;

import com.ssafy.ssarvis.chat.domain.AudioMeta;
import com.ssafy.ssarvis.chat.domain.ChatMessageStatus;
import com.ssafy.ssarvis.chat.domain.ChatMode;
import com.ssafy.ssarvis.chat.domain.SpeakerType;
import org.springframework.data.annotation.Id;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "chat_messages")
@CompoundIndexes({
    @CompoundIndex(
        name = "session_created_at_idx",
        def = "{'sessionId': 1, 'createdAt': 1}"
    ),
    @CompoundIndex(
        name = "session_speaker_created_at_idx",
        def = "{'sessionId': 1, 'speakerType': 1, 'createdAt': 1}"
    )
})
public class ChatMessageDocument {
    @Id
    private String id;

    @Indexed
    private String sessionId;

    private Long userId;

    private Long assistantId;

    private ChatMode chatMode;

    private SpeakerType speakerType;

    private Long speakerId;

    private String text;

    // RECEIVED, STREAMING, COMPLETE, FAILED
    @Indexed
    private ChatMessageStatus chatMessageStatus;

    private AudioMeta audio;

//    성능에 대한 기록
//    private LlmMeta llmMeta;

    @Indexed
    private LocalDateTime createdAt;

    public static ChatMessageDocument createUserMessage(
        String sessionId,
        Long userId,
        Long assistantId,
        ChatMode chatMode,
        String text,
        AudioMeta audio,
        LocalDateTime now
    ) {
        return ChatMessageDocument.builder()
            .sessionId(sessionId)
            .userId(userId)
            .assistantId(assistantId)
            .chatMode(chatMode)
            .text(text)
            .audio(audio)
            .createdAt(now)
            .build();
    }

    public static ChatMessageDocument createAssistantMessage(
        String sessionId,
        Long userId,
        Long assistantId,
        ChatMode chatMode,
        String text,
        LocalDateTime now
    ) {
        return ChatMessageDocument.builder()
            .sessionId(sessionId)
            .userId(userId)
            .assistantId(assistantId)
            .chatMode(chatMode)
            .text(text)
            .chatMessageStatus(ChatMessageStatus.STREAMING)
            .createdAt(now)
            .build();
    }

    public void complete(AudioMeta audio) {
        this.audio = audio;
        this.chatMessageStatus = ChatMessageStatus.COMPLETE;
    }

    public void fail() {
        this.chatMessageStatus = ChatMessageStatus.FAILED;
    }
}
