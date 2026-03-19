package com.ssafy.ssarvis.chat.dto.response;

public record ChatWsResponseDto(
    String type,
    String sessionId,
    String messageId,
    String text,
    String payload,
    Integer sequence
) {

}
