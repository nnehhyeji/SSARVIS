package com.ssafy.ssarvis.chat.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AudioMeta {

    private String s3Key;

    private Integer durationMs;

    private String contentType;

    private Long fileSize;
}