package com.ssafy.ssarvis.chat.service.impl;

import com.ssafy.ssarvis.chat.document.ChatMessageDocument;
import com.ssafy.ssarvis.chat.document.ChatSessionDocument;
import com.ssafy.ssarvis.chat.domain.AudioMeta;
import com.ssafy.ssarvis.chat.dto.request.ChatUserMessageCreateRequestDto;
import com.ssafy.ssarvis.chat.dto.response.ChatMessageResponseDto;
import com.ssafy.ssarvis.chat.repository.ChatMessageRepository;
import com.ssafy.ssarvis.chat.repository.ChatSessionRepository;
import com.ssafy.ssarvis.chat.service.ChatMessageService;
import com.ssafy.ssarvis.chat.service.ChatSessionService;
import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.constant.Constants;
import com.ssafy.ssarvis.common.dto.ListResponseDto;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class ChatMessageServiceImpl implements ChatMessageService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatSessionService chatSessionService;

    @Override
    public ChatMessageResponseDto saveUserMessage(Long userId, ChatUserMessageCreateRequestDto chatUserMessageCreateRequestDto) {
        ChatSessionDocument chatSessionDocument = getSession(chatUserMessageCreateRequestDto.sessionId());
        validateSessionOwner(chatSessionDocument, userId);

        LocalDateTime now = LocalDateTime.now();

        ChatMessageDocument chatMessageDocument = ChatMessageDocument.createUserMessage(
            chatSessionDocument.getId(),
            chatSessionDocument.getUserId(),
            chatSessionDocument.getAssistantId(),
            chatSessionDocument.getAssistantType(),
            chatUserMessageCreateRequestDto.text(),
            chatUserMessageCreateRequestDto.audio(),
            now
        );

        // 유저 메시지 저장
        ChatMessageDocument savedDocument = chatMessageRepository.save(chatMessageDocument);
        // 대화 개수 증가 + 세션 연장
        chatSessionService.maintainSession(chatSessionDocument.getId(), chatUserMessageCreateRequestDto.text());

        return ChatMessageResponseDto.from(savedDocument);
    }

    @Override
    public ChatMessageResponseDto createAssistantMessage(String sessionId, String text) {
        ChatSessionDocument chatSessionDocument = getSession(sessionId);

        LocalDateTime now = LocalDateTime.now();

        ChatMessageDocument chatMessageDocument = ChatMessageDocument.createAssistantMessage(
            chatSessionDocument.getId(),
            chatSessionDocument.getUserId(),
            chatSessionDocument.getAssistantId(),
            chatSessionDocument.getAssistantType(),
            text,
            now
        );
        // AI 메시지 저장
        ChatMessageDocument savedDocument = chatMessageRepository.save(chatMessageDocument);
        // 대화 개수 증가 + 세션 연장
        chatSessionService.maintainSession(chatSessionDocument.getId(), text);

        return ChatMessageResponseDto.from(savedDocument);
    }

    @Override
    public void completeAssistantMessage(String messageId, AudioMeta audioMeta) {
        ChatMessageDocument chatMessageDocument = getMessage(messageId);
        // 음성 데이터 메타 정보와 함께 저장
        chatMessageDocument.complete(audioMeta);
        chatMessageRepository.save(chatMessageDocument);
    }

    @Override
    public void failAssistantMessage(String messageId) {
        ChatMessageDocument chatMessageDocument = getMessage(messageId);
        // 음성 데이터 저장 시 오류 발생
        chatMessageDocument.fail();
        chatMessageRepository.save(chatMessageDocument);
    }

    @Override
    public List<ChatMessageResponseDto> findRecentMessagesBySessionId(Long userId, String sessionId) {
        ChatSessionDocument chatSessionDocument = getSession(sessionId);
        validateSessionOwner(chatSessionDocument, userId);
        Pageable pageable = PageRequest.of(0, Constants.CHAT_HISTORY_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt"));

        List<ChatMessageDocument> recentDocs = chatMessageRepository.findBySessionId(sessionId, pageable);

        return recentDocs.stream()
            .sorted(Comparator.comparing(ChatMessageDocument::getCreatedAt))
            .map(ChatMessageResponseDto::from)
            .toList();
    }

    @Override
    public ListResponseDto<ChatMessageResponseDto> getChatMessage(Long userId, String sessionId, String lastOffsetId,
        int limit) {
        PageRequest pageRequest = PageRequest.of(0, limit);
        List<ChatMessageDocument> messages;
        ChatSessionDocument sessionDocument = chatSessionRepository.findById(sessionId).orElseThrow(
            () -> new CustomException("존재하지 않는 채팅 세션입니다.", ErrorCode.CHAT_SESSION_NOT_FOUND));

        validateSessionOwner(sessionDocument, userId);

        // Cursor Pagination 분기 처리
        if (!StringUtils.hasText(lastOffsetId)) {
            // 첫 조회
            messages = chatMessageRepository.findBySessionIdOrderByIdDesc(sessionId, pageRequest);
        } else {
            // 이전 대화 스크롤 조회
            messages = chatMessageRepository.findBySessionIdAndIdLessThanOrderByIdDesc(sessionId, lastOffsetId, pageRequest);
        }
        // ASC로 뒤집기
        Collections.reverse(messages);
        List<ChatMessageResponseDto> messageList =messages.stream()
            .map(ChatMessageResponseDto::from)
            .toList();
        return ListResponseDto.from(messageList);
    }

    private ChatSessionDocument getSession(String sessionId) {
        return chatSessionRepository.findById(sessionId)
            .orElseThrow(() -> new CustomException("채팅 세션을 찾을 수 없습니다. sessionId=" + sessionId,
                ErrorCode.CHAT_SESSION_NOT_FOUND));
    }

    private ChatMessageDocument getMessage(String messageId) {
        return chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new CustomException("채팅 메세지를 찾을 수 없습니다. messageId=" + messageId, ErrorCode.CHAT_MESSAGE_NOT_FOUND));
    }

    private void validateSessionOwner(ChatSessionDocument chatSessionDocument, Long requestUserId) {
        boolean isSender = chatSessionDocument.getUserId().equals(requestUserId);
        boolean isAvatarOwner = chatSessionDocument.getTargetUserId().equals(requestUserId);

        if (!isSender && !isAvatarOwner) {
            throw new CustomException("접근 권한이 없습니다. 대화 당사자나 아바타 소유주만 열람할 수 있습니다.", ErrorCode.UNAUTHORIZED);
        }
    }
}
