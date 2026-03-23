package com.ssafy.ssarvis.chat.dto.request;


import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.chat.domain.ChatSessionType;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;

public record ClientChatMessageDto(
    String type, // START, AUDIO, TEXT, CANCEL
    String sessionId, // 첫 null 이후 존재
    Long targetUserId,
    ChatSessionType chatSessionType,
    AssistantType assistantType,  // {DAILY, STUDY, COUNSEL, PERSONA}
    MemoryPolicy memoryPolicy, // GENERAL, SECRET
    Boolean hasAudio,
    String text // STT된 원문
) {

}


// 친구 assistantId
//