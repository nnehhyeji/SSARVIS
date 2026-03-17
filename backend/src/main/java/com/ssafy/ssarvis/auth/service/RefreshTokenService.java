package com.ssafy.ssarvis.auth.service;

import com.ssafy.ssarvis.common.constant.Constants;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final StringRedisTemplate stringRedisTemplate;

    public void save(Long userId, String refreshToken, long refreshTokenExpireTimeMillis) {
        String key = generateKey(userId);
        stringRedisTemplate.opsForValue().set(
            key,
            refreshToken,
            Duration.ofMillis(refreshTokenExpireTimeMillis)
        );
    }

    public boolean matches(Long userId, String refreshToken) {
        // TODO: Redis/DB 저장된 refresh token과 비교 로직 작성
        String savedRefreshToken = stringRedisTemplate.opsForValue().get(generateKey(userId));
        return refreshToken != null && refreshToken.equals(savedRefreshToken);
    }

    public void delete(Long userId) {
        stringRedisTemplate.delete(generateKey(userId));
    }

    private String generateKey(Long userId) {
        return Constants.REFRESH_TOKEN_COOKIE_NAME + userId;
    }
}