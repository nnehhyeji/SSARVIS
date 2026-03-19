package com.ssafy.ssarvis.chat.dto.response;

public record AiChatResponseChunkDto(
    // TEXT, AUDIO_CHUNK, AUDIO_END, ERROR
    String type,
    String text,
    String payload,
    Integer sequence,
    String contentType
) {

}
