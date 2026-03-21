package com.ssafy.ssarvis.auth.interceptor;

import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.auth.security.CustomUserDetailsService;
import com.ssafy.ssarvis.auth.util.JwtUtil;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationWebSocketInterceptor implements HandshakeInterceptor {
    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService customUserDetailsService;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
        WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {

        String accessToken = resolveAccessToken(request);

        if (!StringUtils.hasText(accessToken) || !jwtUtil.validateToken(accessToken)) {
            // 토큰이 없거나 유효하지 않으면 연결(Handshake) 자체를 거부
            return false;
        }

        Long userId = jwtUtil.getUserId(accessToken);
        CustomUserDetails customUserDetails = customUserDetailsService.loadUserById(userId);
        Authentication authentication = new UsernamePasswordAuthenticationToken(customUserDetails,
            null, customUserDetails.getAuthorities());

        attributes.put("authentication", authentication);
        attributes.put("userId", userId);

        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
        WebSocketHandler wsHandler, Exception exception) {}

    private String resolveAccessToken(ServerHttpRequest request) {
        if (request instanceof ServletServerHttpRequest) {
            ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
            String token = servletRequest.getServletRequest().getParameter("token");
            if (StringUtils.hasText(token)) {
                return token;
            }
        }
        return null;
    }
}