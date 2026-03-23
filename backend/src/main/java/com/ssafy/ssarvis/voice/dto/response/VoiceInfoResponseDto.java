package com.ssafy.ssarvis.voice.dto.response;

import com.ssafy.ssarvis.voice.entity.Voice;

public record VoiceInfoResponseDto(
    String modelId,
    String voiceStt
) {
    public static VoiceInfoResponseDto from(Voice voice) {
        return new VoiceInfoResponseDto(voice.getModelId(), voice.getVoiceStt());
    }
}