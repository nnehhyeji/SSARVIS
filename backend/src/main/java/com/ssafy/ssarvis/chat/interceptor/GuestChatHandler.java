package com.ssafy.ssarvis.chat.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.ssarvis.assistant.repository.AssistantRepository;
import com.ssafy.ssarvis.assistant.repository.AssistantVoiceProjection;
import com.ssafy.ssarvis.chat.dto.request.AiChatRequestDto;
import com.ssafy.ssarvis.chat.dto.request.ClientChatMessageDto;
import com.ssafy.ssarvis.chat.service.GuestAiRequestRelayService;
import com.ssafy.ssarvis.chat.service.GuestChatRedisService;
import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.user.entity.Prompt;
import com.ssafy.ssarvis.user.entity.PromptType;
import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.PromptRepository;
import com.ssafy.ssarvis.user.repository.UserRepository;
import com.ssafy.ssarvis.user.service.UserService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Slf4j
@Component
@RequiredArgsConstructor
public class GuestChatHandler extends TextWebSocketHandler {

    private final GuestAiRequestRelayService aiRelayService;
    private final GuestChatRedisService redisService;
    private final ObjectMapper objectMapper;
    private final AssistantRepository assistantRepository;
    private final PromptRepository promptRepository;
    private final UserRepository userRepository;

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();

        // 기존 ClientChatMessageDto 재사용 매핑
        ClientChatMessageDto request = objectMapper.readValue(payload, ClientChatMessageDto.class);

        // 임시 SessionID 발급 파이프라인 (프론트 통신 규격)
        String activeSessionId = request.sessionId();
        if (activeSessionId == null || activeSessionId.isBlank()) {
            activeSessionId = UUID.randomUUID().toString();
            // 클라이언트에게 ID가 할당되었음을 알림 (추후 이 ID를 포함해 TEXT를 발송토록 함)
            session.sendMessage(new TextMessage("{\"type\":\"SESSION_ASSIGNED\", \"sessionId\":\"" + activeSessionId + "\"}"));
        }

        if ("TEXT".equals(request.type())) {
            User aiOwner = userRepository.getReferenceById(request.targetUserId());
            String currentUserText = request.text();

            // DB에서 타겟 봇의 부가 정보(Model ID, Prompt) 조회 로직
            AssistantVoiceProjection assistantVoice = assistantRepository.getAssistantIdAndModelIdByUserIdAndAssistantType(aiOwner.getId(), request.assistantType())
                .orElseThrow(() -> new CustomException("ASSISTANT가 존재하지 않습니다.", ErrorCode.ASSISTANT_NOT_FOUND));

            String voiceId = assistantVoice.getModelId();
            Prompt systemPrompt = promptRepository.findTopByUserAndPromptTypeOrderByIdDesc(
                    aiOwner, PromptType.USER).orElseThrow(()-> new CustomException("존재하지 않는 유저입니다.", ErrorCode.USER_NOT_FOUND));

            // Redis 대화 내역(History) 즉각 누적 (TTL 부여)
            redisService.appendHistory(activeSessionId, "USER", currentUserText);

            AiChatRequestDto aiRequest = new AiChatRequestDto(
                activeSessionId,                             // sessionId: 처음 null, 이후 해당 sessionId
                aiOwner.getId(),                             // userId: targetUserId
                request.chatSessionType(),                   // chatSessionType: AVATAR_AI
                null,                                        // isFollowing
                request.assistantType(),                     // chatMode: DAILY
                request.memoryPolicy(),                      // memoryPolicy: SECRET
                systemPrompt.getPromptText(),                // systemPrompt
                redisService.getHistory(activeSessionId),    // history
                currentUserText,                             // text
                voiceId                                      // voiceId
            );

            // 1:1 웹소켓 릴레이 서비스 파이프라인 태우기
            aiRelayService.sendToFastApi(session, aiRequest, activeSessionId);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.info("Guest WebSocket disconnected: {}", session.getId());
        aiRelayService.closeFastApiSession(session.getId());
    }
}