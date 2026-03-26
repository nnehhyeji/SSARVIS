package com.ssafy.ssarvis.common.config;

import com.ssafy.ssarvis.auth.interceptor.JwtAuthenticationWebSocketInterceptor;
import com.ssafy.ssarvis.chat.interceptor.AudioStreamingHandler;
import com.ssafy.ssarvis.chat.interceptor.GuestChatHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final JwtAuthenticationWebSocketInterceptor jwtAuthenticationWebSocketInterceptor;
    private final AudioStreamingHandler audioStreamingHandler;
    private final GuestChatHandler guestChatHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // 회원용, 인증 처리 포함
        registry.addHandler(audioStreamingHandler, "/ws/chat")
            .addInterceptors(jwtAuthenticationWebSocketInterceptor)
            .setAllowedOriginPatterns("*"); // 로컬 개발용. 운영 시 프론트 도메인으로 제한

        // 비회원용, 인증 처리 X
        registry.addHandler(guestChatHandler, "/ws/guest/chat")
            .setAllowedOrigins("*");
    }

    // 웹소켓 버퍼 사이즈 설정
    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxTextMessageBufferSize(1024 * 1024); // 텍스트는 8KB
        container.setMaxBinaryMessageBufferSize(1024 * 1024); // 바이너리 청크는 512KB까지 허용
        container.setMaxSessionIdleTimeout(300000L); // 5분 동안 입력 없으면 끊음
        return container;
    }
}
