package com.ssafy.ssarvis.chat.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

public record AiStreamMessageDto(
    String type,
    String sessionId,
    Integer sequence,
    Payload payload,
    String detail
) {
    public record Payload(
        String text,
        String mimeType,
        String code,
        List<ErrorDetail> errors
    ){}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ErrorDetail(
        String message,
        String type,
        List<String> loc
    ){}
}
