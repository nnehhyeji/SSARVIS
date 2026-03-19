package com.ssafy.ssarvis.voice.dto.request;

import jakarta.validation.constraints.NotBlank;

public record VoiceUploadRequestDto(
    @NotBlank(message = "STT 텍스트는 필수입니다")
    String sttText
) {
}