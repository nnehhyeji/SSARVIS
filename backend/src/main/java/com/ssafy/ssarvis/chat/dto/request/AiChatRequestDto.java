package com.ssafy.ssarvis.chat.dto.request;

import com.ssafy.ssarvis.chat.domain.ChatMode;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;

public record AiChatRequestDto(
    String sessionId,
    Long userId,
    Long assistantId,
    ChatMode chatMode,
    MemoryPolicy memoryPolicy,
    String text
) {
}
