package com.ssafy.ssarvis.chat.dto.request;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AiChatRequestDto(
    String sessionId,
    Long userId,
    AssistantType chatMode,
    MemoryPolicy memoryPolicy,
    String systemPrompt,
    List<Map<String, String>> history,
    String text,
    String voiceId
    ) {
}
