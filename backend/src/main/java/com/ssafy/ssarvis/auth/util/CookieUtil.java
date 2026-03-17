package com.ssafy.ssarvis.auth.util;

import com.ssafy.ssarvis.common.constant.Constants;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieUtil {

    private CookieUtil() {}

    public ResponseCookie createRefreshTokenCookie(String refreshToken, long maxAgeSeconds) {
        return ResponseCookie.from(Constants.REFRESH_TOKEN_COOKIE_NAME, refreshToken)
            .httpOnly(true)
            .secure(true)
            .path("/")
            .sameSite("Strict")
            .maxAge(maxAgeSeconds)
            .build();
    }

    public ResponseCookie deleteRefreshTokenCookie() {
        return ResponseCookie.from(Constants.REFRESH_TOKEN_COOKIE_NAME, "")
            .httpOnly(true)
            .secure(true)
            .path("/")
            .sameSite("Strict")
            .maxAge(0)
            .build();
    }
}