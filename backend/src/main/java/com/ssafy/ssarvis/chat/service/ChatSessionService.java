package com.ssafy.ssarvis.chat.service;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.chat.domain.ChatSessionType;
import com.ssafy.ssarvis.chat.dto.request.ChatSessionCreateRequestDto;
import com.ssafy.ssarvis.chat.dto.response.ChatSessionResponseDto;
import com.ssafy.ssarvis.chat.dto.response.TopChatterResponseDto;
import com.ssafy.ssarvis.common.dto.ListResponseDto;

import java.util.List;
import org.springframework.data.domain.Pageable;

public interface ChatSessionService {

    ChatSessionResponseDto getOrCreateSession(ChatSessionCreateRequestDto chatSessionCreateRequestDto);

    ChatSessionResponseDto createNewSession(ChatSessionCreateRequestDto chatSessionCreateRequestDto);

    ChatSessionResponseDto findById(String sessionId);

    ListResponseDto<ChatSessionResponseDto> findByUserId(Long userId);

    ListResponseDto<ChatSessionResponseDto> getUserSessionsList(Long userId, String type,
        AssistantType assistantType, ChatSessionType chatSessionType, Pageable pageable);

    void endSession(String sessionId);

    void touchSession(String sessionId);

    void maintainSession(String sessionId, String text);

    void timeoutSession(String sessionId);

    List<TopChatterResponseDto> getTopChattingFriends(Long myUserId);

}
