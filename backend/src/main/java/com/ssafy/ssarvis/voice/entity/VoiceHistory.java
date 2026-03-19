package com.ssafy.ssarvis.voice.entity;

import jakarta.persistence.Id;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Document(collation = "voice_lock_histories")
public class VoiceHistory {

    @Id
    private String id;

    private Long userId;

    private String s3Url;

    private String sttText;

    @CreatedDate
    private LocalDateTime createdAt;

}

