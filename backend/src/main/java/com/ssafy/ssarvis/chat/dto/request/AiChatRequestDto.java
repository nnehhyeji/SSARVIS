package com.ssafy.ssarvis.chat.dto.request;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.chat.domain.ChatSessionType;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import java.util.List;
import java.util.Map;

public record AiChatRequestDto(
    String sessionId,
    Long userId,
    ChatSessionType chatSessionType,
    Boolean isFollowing,
    AssistantType chatMode,
    MemoryPolicy memoryPolicy,
    String systemPrompt,
    List<Map<String, String>> history,
    String text,
    String voiceId
    ) {
}


// ChatSessionType   USER_AI, AVATAR_AI
// ISFOLLOWING       PUB / PRIV (TRUE/FALSE)
