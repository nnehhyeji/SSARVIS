package com.ssafy.ssarvis.chat.service.impl;

import com.ssafy.ssarvis.chat.document.ChatSessionDocument;
import com.ssafy.ssarvis.chat.domain.ChatSessionStatus;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import com.ssafy.ssarvis.chat.dto.request.ChatSessionCreateRequestDto;
import com.ssafy.ssarvis.chat.dto.response.ChatSessionResponseDto;
import com.ssafy.ssarvis.chat.repository.ChatSessionRepository;
import com.ssafy.ssarvis.chat.service.ChatSessionService;
import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.constant.Constants;
import com.ssafy.ssarvis.common.dto.ListResponseDto;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatSessionServiceImpl implements ChatSessionService {

    private final ChatSessionRepository chatSessionRepository;

    @Override
    public ChatSessionResponseDto getOrCreateSession(ChatSessionCreateRequestDto chatSessionCreateRequestDto) {
        if (chatSessionCreateRequestDto.memoryPolicy() == MemoryPolicy.GENERAL) {
            return chatSessionRepository.findByUserIdAndAssistantTypeAndMemoryPolicyAndChatSessionStatus(
                    chatSessionCreateRequestDto.userId(),
                    chatSessionCreateRequestDto.assistantType(),
                    MemoryPolicy.GENERAL,
                    ChatSessionStatus.ACTIVE
                )
                .map(ChatSessionResponseDto::from)
                .orElseGet(() -> createNewSession(chatSessionCreateRequestDto));
        }

        return createNewSession(chatSessionCreateRequestDto);
    }

    @Override
    public ChatSessionResponseDto createNewSession(ChatSessionCreateRequestDto chatSessionCreateRequestDto) {
        LocalDateTime now = LocalDateTime.now();

        ChatSessionDocument chatSessionDocument = ChatSessionDocument.create(
            chatSessionCreateRequestDto.userId(),
            chatSessionCreateRequestDto.assistantId(),
            chatSessionCreateRequestDto.assistantType(),
            chatSessionCreateRequestDto.chatSessionType(),
            chatSessionCreateRequestDto.title(),
            chatSessionCreateRequestDto.memoryPolicy(),
            now,
            calculateExpiredAt(chatSessionCreateRequestDto.memoryPolicy(), now)
        );
        ChatSessionDocument saved = chatSessionRepository.save(chatSessionDocument);
        return ChatSessionResponseDto.from(saved);
    }

    @Override
    public ChatSessionResponseDto findById(String sessionId) {
        return ChatSessionResponseDto.from(this.getSession(sessionId));
    }

    @Override
    public ListResponseDto<ChatSessionResponseDto> findByUserId(Long userId) {
        return ListResponseDto.from(
            chatSessionRepository.findByUserIdOrderByLastMessageAtDesc(userId)
                .stream()
                .map(ChatSessionResponseDto::from)
                .toList()
        );
    }

    @Override
    public void endSession(String sessionId) {
        ChatSessionDocument session = getSession(sessionId);
        session.end();
        chatSessionRepository.save(session);
    }

    @Override
    public void touchSession(String sessionId) {
        ChatSessionDocument session = getSession(sessionId);
        LocalDateTime now = LocalDateTime.now();

        session.touch(now, calculateExpiredAt(session.getMemoryPolicy(), now));
        chatSessionRepository.save(session);
    }

    @Override
    public void increaseMessageCount(String sessionId) {
        ChatSessionDocument session = getSession(sessionId);
        LocalDateTime now = LocalDateTime.now();

        session.increaseMessageCount(now, calculateExpiredAt(session.getMemoryPolicy(), now));
        chatSessionRepository.save(session);
    }

    @Override
    public void timeoutSession(String sessionId) {
        ChatSessionDocument session = getSession(sessionId);

        session.timeout();
        chatSessionRepository.save(session);
    }

    private LocalDateTime calculateExpiredAt(MemoryPolicy memoryPolicy, LocalDateTime now) {
        if (memoryPolicy == MemoryPolicy.SECRET) {
            return now.plusMinutes(Constants.SECRET_IDLE_TIMEOUT_MINUTES);
        }
        return now.plusHours(Constants.GENERAL_IDLE_TIMEOUT_HOURS);
    }

    private ChatSessionDocument getSession(String sessionId) {
        return chatSessionRepository.findById(sessionId)
            .orElseThrow(() -> new CustomException("채팅 세션이 없습니다. sessionId=" + sessionId,
                ErrorCode.CHAT_SESSION_NOT_FOUND));
    }
}
