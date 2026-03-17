package com.ssafy.ssarvis.auth.service;

import org.springframework.stereotype.Service;

@Service
public class RefreshTokenService {

    public boolean matches(Long userId, String refreshToken) {
        // TODO: Redis/DB 저장된 refresh token과 비교 로직 작성
        return true;
    }
}