package com.ssafy.ssarvis.chat.document;

import com.ssafy.ssarvis.chat.domain.AudioMeta;
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

    private ChatMode mode;

    private SpeakerType speakerType;

    private Long speakerId;

    private String text;

    @Indexed
    private String status; // RECEIVED, STREAMING, COMPLETE, FAILED

    private AudioMeta audio;

//    성능에 대한 기록
//    private LlmMeta llmMeta;

    @Indexed
    private LocalDateTime createdAt;
}
