package com.ssafy.ssarvis.chat.service.impl;

import static com.ssafy.ssarvis.common.exception.ErrorCode.UNAUTHORIZED;

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
import com.ssafy.ssarvis.common.dto.ListResponseDto;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
            chatSessionDocument.getChatMode(),
            chatUserMessageCreateRequestDto.text(),
            chatUserMessageCreateRequestDto.audio(),
            now
        );

        // 유저 메시지 저장
        ChatMessageDocument savedDocument = chatMessageRepository.save(chatMessageDocument);
        // 대화 개수 증가 + 세션 연장
        chatSessionService.increaseMessageCount(chatSessionDocument.getId());

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
            chatSessionDocument.getChatMode(),
            text,
            now
        );
        // AI 메시지 저장
        ChatMessageDocument savedDocument = chatMessageRepository.save(chatMessageDocument);
        // 대화 개수 증가 + 세션 연장ㄴ
        chatSessionService.increaseMessageCount(chatSessionDocument.getId());

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
    public ListResponseDto<ChatMessageResponseDto> findMessagesBySessionId(Long userId, String sessionId) {
        ChatSessionDocument chatSessionDocument = getSession(sessionId);
        validateSessionOwner(chatSessionDocument, userId);

        return ListResponseDto.from(
            chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(ChatMessageResponseDto::from)
                .toList()
        );
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

    private void validateSessionOwner(ChatSessionDocument chatSessionDocument, Long userId) {
        if (!chatSessionDocument.getUserId().equals(userId)) {
            throw new CustomException("요청인이 다릅니다.", UNAUTHORIZED);
        }
    }
}
