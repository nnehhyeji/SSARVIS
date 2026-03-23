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

    private String audioUrl;

    private String contentType;

    private String fileName;

    private Long fileSize;
}