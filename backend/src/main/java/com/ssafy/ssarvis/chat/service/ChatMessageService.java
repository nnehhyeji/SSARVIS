package com.ssafy.ssarvis.chat.service;

import com.ssafy.ssarvis.chat.domain.AudioMeta;
import com.ssafy.ssarvis.chat.dto.request.ChatUserMessageCreateRequestDto;
import com.ssafy.ssarvis.chat.dto.response.ChatMessageResponseDto;
import com.ssafy.ssarvis.common.dto.ListResponseDto;

public interface ChatMessageService {
    ChatMessageResponseDto saveUserMessage(Long userId, ChatUserMessageCreateRequestDto requestDto);

    ChatMessageResponseDto createAssistantMessage(String sessionId, String text);

    void completeAssistantMessage(String sessionId, AudioMeta audio);

    void failAssistantMessage(String sessionId);

    ListResponseDto<ChatMessageResponseDto> findMessagesBySessionId(Long userId, String sessionId);
}
