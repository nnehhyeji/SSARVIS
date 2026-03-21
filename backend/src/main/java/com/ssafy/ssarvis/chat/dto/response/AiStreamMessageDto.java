package com.ssafy.ssarvis.chat.dto.response;

public record AiStreamMessageDto(
    String type,
    String sessionId,
    Integer sequence,
    Payload payload
) {
    public record Payload(
        String text,
        String mimeType
    ){}
}
