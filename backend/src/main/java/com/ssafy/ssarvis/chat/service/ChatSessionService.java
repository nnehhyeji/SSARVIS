package com.ssafy.ssarvis.chat.service;

import com.ssafy.ssarvis.chat.dto.request.ChatSessionCreateRequestDto;
import com.ssafy.ssarvis.chat.dto.response.ChatSessionResponseDto;
import com.ssafy.ssarvis.common.dto.ListResponseDto;

public interface ChatSessionService {

    ChatSessionResponseDto getOrCreateSession(ChatSessionCreateRequestDto chatSessionCreateRequestDto);

    ChatSessionResponseDto createNewSession(ChatSessionCreateRequestDto chatSessionCreateRequestDto);

    ChatSessionResponseDto findById(String sessionId);

    ListResponseDto<ChatSessionResponseDto> findByUserId(Long userId);

    void endSession(String sessionId);

    void touchSession(String sessionId);

    void increaseMessageCount(String sessionId);

    void timeoutSession(String sessionId);
}
