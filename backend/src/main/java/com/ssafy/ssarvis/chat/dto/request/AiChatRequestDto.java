package com.ssafy.ssarvis.chat.dto.request;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AiChatRequestDto(
    String sessionId,
    Long userId,
    UUID voiceId,
    AssistantType assistantType,
    MemoryPolicy memoryPolicy,
    String text,
    List<Map<String, String>> history
) {
}
