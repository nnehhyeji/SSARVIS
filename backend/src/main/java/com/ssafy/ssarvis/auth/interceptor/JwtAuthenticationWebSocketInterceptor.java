package com.ssafy.ssarvis.auth.interceptor;

import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.auth.security.CustomUserDetailsService;
import com.ssafy.ssarvis.auth.util.JwtUtil;
import com.ssafy.ssarvis.common.constant.Constants;
import com.ssafy.ssarvis.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
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
        WebSocketHandler wsHandler, Exception exception) {

    }

    private String resolveAccessToken(ServerHttpRequest request) {
        String authorizationHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(authorizationHeader)
            && authorizationHeader.startsWith(Constants.BEARER_PREFIX)
        ) {
            return authorizationHeader.substring(Constants.BEARER_PREFIX.length());
        }
        return null;
    }
}
