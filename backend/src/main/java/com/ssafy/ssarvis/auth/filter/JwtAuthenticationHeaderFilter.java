package com.ssafy.ssarvis.common.config;

import com.ssafy.ssarvis.auth.jwt.JwtProvider;
import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.auth.service.CustomUserDetailService;
import com.ssafy.ssarvis.auth.service.RefreshTokenService;
import com.ssafy.ssarvis.common.constant.Constants;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationHeaderFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final CustomUserDetailService customUserDetailService;
    private final RefreshTokenService refreshTokenService;

    // 사용자의 모든 요청이 거치는 JWT 토큰 필터
    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String accessToken = resolveAccessToken(request);

            // Token이 없는 요청의 경우, 필터 통과 -> Spring Security에 위임
            if (!StringUtils.hasText(accessToken)) {
                filterChain.doFilter(request, response);
                return;
            }

            // 유효한 token인 경우 Authentication 등록 -> 필터 통과
            boolean isValid = jwtProvider.validateToken(accessToken);
            if (isValid) {
                Long userId = jwtProvider.getUserId(accessToken);
                setAuthentication(request, userId);

                filterChain.doFilter(request, response);
                return;
            }

            // AccessToken 만료시 -> RefreshToken 재발급 -> 필터 통과 (예외 X시)
            boolean reissued = reissueAccessToken(request, response);
            if (!reissued) {
                return;
            }

            filterChain.doFilter(request, response);
        } catch (
            SignatureException
            | MalformedJwtException
            | UnsupportedJwtException
            | IllegalArgumentException e
        ) {
            log.warn("JWT 변조 의심 ip={} method={} uri={}",
                getClientIp(request),
                request.getMethod(),
                request.getRequestURI());
            // 토큰 변조/이상 시 바로 응답
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid Token");
        }
    }

    /**
     * SecurityContextHolder에 userId정보 저장 -> 추후 @AuthenticationPrinciple 로 CustomUserDetail 추출
     * @param request 요청 HttpServletRequest
     * @param userId 요청 AccessToken의 userId
     */
    private void setAuthentication(HttpServletRequest request, Long userId) {
        CustomUserDetails userDetails = customUserDetailService.loadUserById(userId);

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
            userDetails,
            null,
            userDetails.getAuthorities()
        );

        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    /**
     * RefreshToken으로 AccessToken 재발급 로직
     * @param request 요청 HttpServletRequest
     * @param response 요청에 대한 응답 HttpServletResponse
     * @return 재발급 성공 여부
     * @throws IOException IOException
     */
    private boolean reissueAccessToken(HttpServletRequest request, HttpServletResponse response) throws IOException{
        String refreshToken = resolveRefreshToken(request);

        // Refresh Token이 null
        if (!StringUtils.hasText(refreshToken)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "RefreshToken not found");
            return false;
        }
        // Refresh Token이 만료됨
        boolean isRefreshTokenValid = jwtProvider.validateToken(refreshToken);
        if (!isRefreshTokenValid) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "RefreshToken expired");
            return false;
        }

        Long userId = jwtProvider.getUserId(refreshToken);
        // Refresh Token이 WhiteList와 불일치
        if (!refreshTokenService.matches(userId, refreshToken)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "RefreshToken mismatch");
            log.warn("RefreshToken WhiteList mismatch ip={} method={} uri={}",
                getClientIp(request),
                request.getMethod(),
                request.getRequestURI()
            );
            return false;
        }

        // RefreshToken 유효 -> AccessToken 재발급, 로직 재개
        String newAccessToken = jwtProvider.createAccessToken(userId);
        response.setHeader(HttpHeaders.AUTHORIZATION, Constants.BEARER_PREFIX + newAccessToken);
        setAuthentication(request, userId);
        return true;
    }

    /**
     * Authorization Header에서 AccessToken 추출
     * @param request 요청 request
     * @return isNull ? null ? String 형식의 AccessToken
     */
    private String resolveAccessToken(HttpServletRequest request) {
        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(authorizationHeader)
            && authorizationHeader.startsWith(Constants.BEARER_PREFIX)
        ) {
            return authorizationHeader.substring(Constants.BEARER_PREFIX.length());
        }
        return null;
    }

    /**
     * Cookie에서 RefreshToken 추출
     * @param request 요청 request
     * @return isNull ? null ? String 형식의 RefreshToken
     */
    private String resolveRefreshToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        // 쿠키에서 "refreshToken": value 추출
        for (Cookie cookie : cookies) {
            if (Constants.REFRESH_TOKEN_COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    /**
     * 변조 / 이상 토큰의 요청 시 ip 저장을 위한 ip 추출 메서드
     * @param request 요청 request
     * @return 요청 ip
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader(Constants.X_FORWARDED_FOR_HEADER_PREFIX);
        if (StringUtils.hasText(xForwardedFor)) {
            // 프록시/ALB 존재시 요청 ip 추출
            return xForwardedFor.split(",")[0].trim();
        }
        // 요청 ip 추출
        return request.getRemoteAddr();
    }
}
