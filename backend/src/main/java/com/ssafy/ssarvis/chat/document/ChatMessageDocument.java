package com.ssafy.ssarvis.chat.document;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.chat.domain.AudioMeta;
import com.ssafy.ssarvis.chat.domain.ChatMessageStatus;
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
import org.springframework.data.mongodb.core.mapping.Field;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "chat_messages")
@CompoundIndexes({
    @CompoundIndex(
        name = "session_created_at_idx",
        def = "{'session_id': 1, 'created_at': 1}"
    ),
    @CompoundIndex(
        name = "session_speaker_created_at_idx",
        def = "{'session_id': 1, 'speaker_type': 1, 'created_at': 1}"
    )
})
public class ChatMessageDocument {
    @Id
    private String id;

    @Indexed
    @Field("session_id")
    private String sessionId;

    @Field("user_id")
    private Long userId;

    @Field("assistant_id")
    private Long assistantId;

    @Field("assistant_type")
    private AssistantType assistantType;

    @Field("speaker_type")
    private SpeakerType speakerType;

    @Field("speaker_id")
    private Long speakerId;

    @Field("text")
    private String text;

    // RECEIVED, STREAMING, COMPLETE, FAILED
    @Indexed
    @Field("chat_mesage_status")
    private ChatMessageStatus chatMessageStatus;

    @Field("audio")
    private AudioMeta audio;

//    성능에 대한 기록
//    private LlmMeta llmMeta;

    @Indexed
    @Field("created_at")
    private LocalDateTime createdAt;

    public static ChatMessageDocument createUserMessage(
        String sessionId,
        Long userId,
        Long assistantId,
        AssistantType assistantType,
        String text,
        AudioMeta audio,
        LocalDateTime now
    ) {
        return ChatMessageDocument.builder()
            .sessionId(sessionId)
            .userId(userId)
            .assistantId(assistantId)
            .assistantType(assistantType)
            .speakerType(SpeakerType.USER)
            .speakerId(userId)
            .text(text)
            .chatMessageStatus(ChatMessageStatus.COMPLETE)
            .audio(audio)
            .createdAt(now)
            .build();
    }

    public static ChatMessageDocument createAssistantMessage(
        String sessionId,
        Long userId,
        Long assistantId,
        AssistantType assistantType,
        String text,
        LocalDateTime now
    ) {
        return ChatMessageDocument.builder()
            .sessionId(sessionId)
            .userId(userId)
            .assistantId(assistantId)
            .assistantType(assistantType)
            .speakerType(SpeakerType.ASSISTANT)
            .speakerId(assistantId)
            .text(text)
            .chatMessageStatus(ChatMessageStatus.STREAMING)
            .createdAt(now)
            .build();
    }

    public void appendText(String chunk) {
        if (this.text == null) {
            this.text = chunk;
            return;
        }
        this.text += chunk;
    }

    public void attachAudio(AudioMeta audio) {
        this.audio = audio;
    }

    public void complete(AudioMeta audio) {
        this.audio = audio;
        this.chatMessageStatus = ChatMessageStatus.COMPLETE;
    }

    public void completeWithoutAudio() {
        this.chatMessageStatus = ChatMessageStatus.COMPLETE;
    }

    public void fail() {
        this.chatMessageStatus = ChatMessageStatus.FAILED;
    }
}
