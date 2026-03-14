package com.ssafy.ssarvis.notification.controller;

import com.ssafy.ssarvis.common.sse.SseEmitterManger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/sse")
@RequiredArgsConstructor
public class SseController {

    private final SseEmitterManger sseEmitterManger;

    // 현재 로그인이 없기때문에 구독 로직은 일시 대기,
//    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
//    public SseEmitter subscribe(@Authen UserDetails userDetails) {
//        Long userId = ((CustomUserDetails) userDetails).getId();
//        log.info("SSE 구독 요청 - userId: {}", userId);
//        return sseEmitterManager.connect(userId);
//    }
}
