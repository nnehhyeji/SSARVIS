package com.ssafy.ssarvis.chat.dto.request;

import com.ssafy.ssarvis.chat.domain.ChatMode;
import com.ssafy.ssarvis.chat.domain.ChatSessionType;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;

public record ChatSessionCreateRequestDto(
    Long userId,
    Long assistantId,
    ChatMode chatMode,
    ChatSessionType chatSessionType,
    String title,
    MemoryPolicy memoryPolicy
) {

}
