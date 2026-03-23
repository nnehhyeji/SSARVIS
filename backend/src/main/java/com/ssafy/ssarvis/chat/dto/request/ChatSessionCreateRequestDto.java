package com.ssafy.ssarvis.chat.dto.request;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.chat.domain.ChatSessionType;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;

public record ChatSessionCreateRequestDto(
    Long userId,
    Long targetUserId,
    Long assistantId,
    AssistantType assistantType,
    ChatSessionType chatSessionType,
    String title,
    MemoryPolicy memoryPolicy
) {

}
