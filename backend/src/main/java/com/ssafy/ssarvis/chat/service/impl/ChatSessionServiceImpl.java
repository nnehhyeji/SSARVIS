package com.ssafy.ssarvis.chat.service.impl;

import com.ssafy.ssarvis.chat.document.ChatSessionDocument;
import com.ssafy.ssarvis.chat.domain.ChatSessionStatus;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import com.ssafy.ssarvis.chat.dto.request.ChatSessionCreateRequestDto;
import com.ssafy.ssarvis.chat.dto.response.ChatSessionResponseDto;
import com.ssafy.ssarvis.chat.dto.response.TopChatterResponseDto;
import com.ssafy.ssarvis.chat.repository.ChatSessionRepository;
import com.ssafy.ssarvis.chat.service.ChatSessionService;
import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.constant.Constants;
import com.ssafy.ssarvis.common.dto.ListResponseDto;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.ssafy.ssarvis.follow.repository.FollowRepository;
import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatSessionServiceImpl implements ChatSessionService {

    private final ChatSessionRepository chatSessionRepository;
    private final UserRepository userRepository;
    private final FollowRepository followRepository;

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
            chatSessionCreateRequestDto.targetUserId(),
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
            chatSessionRepository.findByUserIdOrTargetUserIdOrderByLastMessageAtDesc(userId, userId)
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
    public void maintainSession(String sessionId, String text) {
        ChatSessionDocument session = getSession(sessionId);
        LocalDateTime now = LocalDateTime.now();

        session.updateSessionState(now, calculateExpiredAt(session.getMemoryPolicy(), now), text);
        chatSessionRepository.save(session);
    }

    @Override
    public void timeoutSession(String sessionId) {
        ChatSessionDocument session = getSession(sessionId);

        session.timeout();
        chatSessionRepository.save(session);
    }

    @Override
    public List<TopChatterResponseDto> getTopChattingFriends(Long myUserId) {
        // 1. 나에게 친구 신청을 보낸(= 내가 수락한) 친구 userId 목록
        List<Long> friendUserIds = followRepository.findByFollowingId(myUserId)
            .stream()
            .map(follow -> follow.getFollower().getId())
            .toList();

        if (friendUserIds.isEmpty()) {
            return List.of();
        }

        // 2. 그 친구들이 나(targetUserId)를 방문한 채팅 세션 조회
        List<ChatSessionDocument> sessions = chatSessionRepository
            .findByTargetUserIdAndUserIdIn(myUserId, friendUserIds);

        if (sessions.isEmpty()) {
            return List.of();
        }

        // 3. userId 기준으로 messageCount 합산
        Map<Long, Long> messageCountByUserId = sessions.stream()
            .collect(Collectors.groupingBy(
                ChatSessionDocument::getUserId,
                Collectors.summingLong(session -> session.getMessageCount() != null ? session.getMessageCount() : 0L)
            ));

        // 4. 유저 정보 조회 후 DTO 변환, 내림차순 정렬
        return messageCountByUserId.entrySet().stream()
            .sorted(Map.Entry.<Long, Long>comparingByValue(Comparator.reverseOrder()))
            .map(entry -> {
                User user = userRepository.findById(entry.getKey())
                    .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));
                return new TopChatterResponseDto(
                    user.getId(),
                    user.getNickname(),
                    user.getProfileImageUrl(),
                    entry.getValue()
                );
            })
            .toList();
    }


    private LocalDateTime calculateExpiredAt(MemoryPolicy memoryPolicy, LocalDateTime now) {
        if (memoryPolicy == MemoryPolicy.SECRET) {
            return now.plusHours(Constants.SECRET_IDLE_TIMEOUT_HOURS);
        }
        return now.plusHours(Constants.GENERAL_IDLE_TIMEOUT_HOURS);
    }

    private ChatSessionDocument getSession(String sessionId) {
        return chatSessionRepository.findById(sessionId)
            .orElseThrow(() -> new CustomException("채팅 세션이 없습니다. sessionId=" + sessionId,
                ErrorCode.CHAT_SESSION_NOT_FOUND));
    }
}
