package com.ssafy.ssarvis.chat.service;

import com.ssafy.ssarvis.chat.domain.AudioMeta;
import com.ssafy.ssarvis.chat.dto.request.ChatUserMessageCreateRequestDto;
import com.ssafy.ssarvis.chat.dto.response.ChatMessageResponseDto;
import com.ssafy.ssarvis.common.dto.ListResponseDto;
import java.util.List;

public interface ChatMessageService {
    ChatMessageResponseDto saveUserMessage(Long userId, ChatUserMessageCreateRequestDto requestDto);

    ChatMessageResponseDto createAssistantMessage(String sessionId, String text);

    void completeAssistantMessage(String sessionId, AudioMeta audio);

    void failAssistantMessage(String sessionId);

    List<ChatMessageResponseDto> findRecentMessagesBySessionId(Long userId, String sessionId);

    ListResponseDto<ChatMessageResponseDto> getChatMessage(Long userId, String sessionId, String lastOffsetId, int limit);
}
