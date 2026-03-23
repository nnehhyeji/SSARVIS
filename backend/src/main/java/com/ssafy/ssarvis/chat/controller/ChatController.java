package com.ssafy.ssarvis.chat.controller;

import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.chat.dto.response.ChatMessageResponseDto;
import com.ssafy.ssarvis.chat.dto.response.ChatSessionResponseDto;
import com.ssafy.ssarvis.chat.service.ChatMessageService;
import com.ssafy.ssarvis.chat.service.ChatSessionService;
import com.ssafy.ssarvis.common.dto.BaseResponse;
import com.ssafy.ssarvis.common.dto.ListResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chats")
public class ChatController {

    private final ChatSessionService chatSessionService;
    private final ChatMessageService chatMessageService;

    @GetMapping
    public ResponseEntity<BaseResponse<ListResponseDto<ChatSessionResponseDto>>> getChatSessions(
        @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        Long userId = customUserDetails.getUserId();
        ListResponseDto<ChatSessionResponseDto> chatSessionList = chatSessionService.findByUserId(userId);

        return ResponseEntity.ok(BaseResponse.success("채팅 내역 리스트 조회 성공", chatSessionList));
    }

    @GetMapping("/{sessionId}/messages")
    public ResponseEntity<BaseResponse<ListResponseDto<ChatMessageResponseDto>>> getChatMessages(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @PathVariable String sessionId,
        @RequestParam(required = false) String lastMessageId,
        @RequestParam(required = false, defaultValue = "30") Integer limit
    ) {
        Long userId = customUserDetails.getUserId();
        ListResponseDto<ChatMessageResponseDto> messages = chatMessageService.getChatMessage(userId,
            sessionId, lastMessageId, limit);

        return ResponseEntity.ok(BaseResponse.success("채팅 리스트 조회 성공", messages));
    }
}
