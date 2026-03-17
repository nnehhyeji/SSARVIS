package com.ssafy.ssarvis.auth.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.util.Date;
import javax.crypto.SecretKey;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class JwtUtil {

    @Value("${jwt.secret-key}")
    private String secret;
    private SecretKey key;

    @Value("${jwt.access-token.expiration}")
    private long accessTokenExpireTime;

    @Getter
    @Value("${jwt.refresh-token.expiration}")
    private long refreshTokenExpireTimeMillis;

    @PostConstruct
    public void init(){
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * AccessToken 생성
     * @param userId userId
     * @return String형태의 Token
     */
    public String createAccessToken(Long userId) {
        Date now = new Date();

        return Jwts.builder()
            .subject(String.valueOf(userId))
            .claims(createAccessClaims())
            .issuedAt(now)
            .expiration(new Date(now.getTime() + accessTokenExpireTime))
            .signWith(key)
            .compact();
    }

    /**
     * RefreshToken 생성
     * @param userId userId
     * @return String형태의 Token
     */
    public String createRefreshToken(Long userId) {
        Date now = new Date();

        return Jwts.builder()
            .subject(String.valueOf(userId))
            .claims(createRefreshClaims())
            .issuedAt(now)
            .expiration(new Date(now.getTime() + refreshTokenExpireTimeMillis))
            .signWith(key)
            .compact();
    }

    /**
     * 추가적으로 토큰에 담을 데이터가 필요하다면 claim에 저장
     * @return 생성된 claims
     */
    private Claims createAccessClaims() {
        return Jwts.claims().build();
    }

    /**
     * 추가적으로 토큰에 담을 데이터가 필요하다면 claim에 저장
     * @return 생성된 claims
     */
    private Claims createRefreshClaims() {
        return Jwts.claims().build();
    }

    /**
     * 토큰 검증
     * @param token token
     * @return 정상 토큰 = true / 만료 토큰 = false
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            // 만료된 경우만 false 리턴
            return false;
        }
    }

    /**
     *
     * @param token
     * @return
     */
    public Claims getClaims(String token) {
        try {
            return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (ExpiredJwtException e) {
            return e.getClaims();
        }
    }

    /**
     * token의 subject에 있는 userId 추출 메서드
     * @param token 전달받은 toekn
     * @return userId
     */
    public Long getUserId(String token) {
        String subject = getClaims(token).getSubject();

        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("토큰 subject가 비어 있습니다.");
        }

        try {
            return Long.valueOf(subject);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("토큰 subject가 숫자 형식이 아닙니다.");
        }
    }
}
