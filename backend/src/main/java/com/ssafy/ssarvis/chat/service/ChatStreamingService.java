package com.ssafy.ssarvis.chat.service;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.assistant.repository.AssistantRepository;
import com.ssafy.ssarvis.assistant.repository.AssistantVoiceProjection;
import com.ssafy.ssarvis.chat.domain.ChatSessionType;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import com.ssafy.ssarvis.chat.domain.SpeakerType;
import com.ssafy.ssarvis.chat.dto.request.AiChatRequestDto;
import com.ssafy.ssarvis.chat.dto.request.ChatSessionCreateRequestDto;
import com.ssafy.ssarvis.chat.dto.response.ChatMessageResponseDto;
import com.ssafy.ssarvis.chat.dto.response.ChatSessionResponseDto;
import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.user.repository.UserRepository;

import java.io.File;
import java.util.List;
import java.util.Map;

import com.ssafy.ssarvis.voice.entity.Prompt;
import com.ssafy.ssarvis.voice.entity.PromptType;
import com.ssafy.ssarvis.voice.repository.PromptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketSession;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatStreamingService {

    private final AssistantRepository assistantRepository;
    private final ChatSessionService chatSessionService;
    private final AiRequestRelayService aiRequestRelayService;
    private final UserInputStorageService userInputStorageService;
    private final ChatMessageService chatMessageService;
    private final PromptRepository promptRepository;

    public void completeUserInput(WebSocketSession frontendSession, Long userId, String sessionId,
                                  AssistantType assistantType, MemoryPolicy memoryPolicy, File inputAudioTempFile,
                                  String finalText) {

        if (!StringUtils.hasText(finalText)) {
            throw new CustomException("최종 STT 텍스트가 비어있습니다.", ErrorCode.USER_INPUT_TEXT_EMPTY);
        }

        AssistantVoiceProjection assistantVoice = assistantRepository.getAssistantIdAndModelIdByUserIdAndAssistantType(
                userId, assistantType)
            .orElseThrow(
                () -> new CustomException("ASSISTANT가 존재하지 않습니다.", ErrorCode.ASSISTANT_NOT_FOUND));

        Long assistantId = assistantVoice.getAssistantId();
        String modelId = assistantVoice.getModelId();

        ChatSessionResponseDto chatSession = resolveSession(
            userId,
            sessionId,
            assistantId,
            assistantType,
            memoryPolicy
        );

        Prompt prompt = promptRepository
            .findTopByUserIdAndPromptTypeOrderByIdDesc(userId, PromptType.USER)
            .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND.getMessage(), ErrorCode.NOT_FOUND));

        String systemPrompt = prompt.getPrompt();

        List<ChatMessageResponseDto> recentMessage = chatMessageService.findRecentMessagesBySessionId(
            userId, chatSession.id());

        List<Map<String, String>> history = recentMessage.stream()
            .map(message -> Map.of(
                "role", message.speakerType() == SpeakerType.USER ? "user" : "assistant",
                "content", message.text() != null ? message.text() : ""
            )).toList();

        // fast api 에 요청 전달
        AiChatRequestDto aiRequest = buildAiChatRequest(
            chatSession,
            userId,
            systemPrompt,
            history,
            finalText,
            modelId
        );
        aiRequestRelayService.send(frontendSession, aiRequest);

        // 비동기로 저장 요청 전송 (S3, Mongo)
        userInputStorageService.saveUserInputAsync(chatSession.id(), userId, inputAudioTempFile,
            finalText);

        log.info("사용자 입력 처리 완료. userId={}, sessionId={}",
            userId, chatSession.id());
    }

    private ChatSessionResponseDto resolveSession(
        Long userId,
        String sessionId,
        Long assistantId,
        AssistantType assistantType,
        MemoryPolicy memoryPolicy
    ) {
        if (StringUtils.hasText(sessionId)) {
            ChatSessionResponseDto foundSession = chatSessionService.findById(sessionId);

            if (!foundSession.userId().equals(userId)) {
                throw new CustomException("본인 세션만 접근 가능합니다.", ErrorCode.UNAUTHORIZED);
            }

            return foundSession;
        }

        return chatSessionService.getOrCreateSession(
            new ChatSessionCreateRequestDto(
                userId,
                assistantId,
                assistantType,
                ChatSessionType.USER_AI,
                null,
                memoryPolicy
            )
        );
    }

    private AiChatRequestDto buildAiChatRequest(
        ChatSessionResponseDto chatSession,
        Long userId,
        String systemPrompt,
        List<Map<String, String>> history,
        String finalText,
        String modelId
    ) {
        return new AiChatRequestDto(
            chatSession.id(),
            userId,
            chatSession.assistantType(),
            chatSession.memoryPolicy(),
            systemPrompt,
            history,
            finalText,
            modelId
        );
    }
}