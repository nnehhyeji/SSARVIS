package com.ssafy.ssarvis.auth.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.ssarvis.auth.dto.response.KakaoTokenResponseDto;
import com.ssafy.ssarvis.auth.dto.response.KakaoUserInfoResponseDto;
import com.ssafy.ssarvis.auth.dto.response.SocialUserInfoDto;
import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.constant.Constants;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthService {

    @Value("${spring.security.oauth2.client.registration.kakao.client-id}")
    private String kakaoClientId;

    @Value("${spring.security.oauth2.client.registration.kakao.client-secret}")
    private String kakaoClientSecret;

    @Value("${spring.security.oauth2.client.registration.kakao.redirect-uri}")
    private String kakaoRedirectUri;

    @Value("${spring.security.oauth2.client.provider.kakao.token-uri}")
    private String tokenUri;

    @Value("${spring.security.oauth2.client.provider.kakao.user-info-uri}")
    private String userInfoUri;

    private static final String REDIS_EMAIL_AUTH_PREFIX = "email_auth:";

    private final RestTemplate restTemplate;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    public String getKakaoAccessToken(String authorizationCode) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", kakaoClientId);
        params.add("redirect_uri", kakaoRedirectUri);
        params.add("code", authorizationCode);
        params.add("client_secret", kakaoClientSecret);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(tokenUri, request, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                // 발급된 JSON을 객체(DTO)로 매핑
                KakaoTokenResponseDto kakaoTokenResponseDto = objectMapper.readValue(response.getBody(), KakaoTokenResponseDto.class);
                return kakaoTokenResponseDto.accessToken(); // 발급받은 실제 카카오 Access Token만 반환
            } else {
                log.error("Kakao Token API 에러 응답: {}", response.getBody());
                throw new CustomException("카카오 요청 중 에러가 발생했습니다.", ErrorCode.OAUTH_TOKEN_FAILED);
            }
        } catch (Exception e) {
            log.error("Kakao Access Token 요청 중 에러 발생", e);
            throw new CustomException("카카오 요청 중 에러가 발생했습니다.", ErrorCode.OAUTH_TOKEN_FAILED);
        }
    }

    public SocialUserInfoDto getKakaoUserInfo(String accessToken) {
        // 헤더 설정
        HttpHeaders headers = new HttpHeaders();
        headers.add("Authorization", "Bearer " + accessToken);
        headers.add("Content-type", "application/x-www-form-urlencoded;charset=utf-8");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(headers);

        // GET 요청 전송
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                userInfoUri,
                HttpMethod.GET,
                request,
                String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                KakaoUserInfoResponseDto kakaoUser = objectMapper.readValue(response.getBody(), KakaoUserInfoResponseDto.class);

                String email = kakaoUser.kakaoAccount().email();
                String nickname = kakaoUser.kakaoAccount().profile().nickname();
                String profileImage = kakaoUser.kakaoAccount().profile().profileImageUrl();

                if (email == null) {
                    throw new CustomException("이메일 정보 제공 동의가 필수적입니다.", ErrorCode.OAUTH_PROFILE_FAILED);
                }

                return SocialUserInfoDto.builder()
                    .email(email)
                    .nickname(nickname)
                    .profileImageUrl(profileImage)
                    .provider(Constants.DEFAULT_PROVIDER)
                    .providerId(String.valueOf(kakaoUser.id()))
                    .build();

            } else {
                log.error("Kakao User Info API 에러 응답: {}", response.getBody());
                throw new CustomException("카카오 유저 정보(Profile) 조회에 실패했습니다.", ErrorCode.OAUTH_PROFILE_FAILED);
            }
        } catch (Exception e) {
            log.error("Kakao User Info 서버 통신 에러", e);
            throw new CustomException("카카오 서버와 통신 중 장애가 발생했습니다.", ErrorCode.OAUTH_PROFILE_FAILED);
        }
    }

    public String saveTempSocialUserToRedis(SocialUserInfoDto socialUserInfoDto) {
        // 임시 등록용 식별자(UUID)
        String registerUUID = UUID.randomUUID().toString();

        // 객체를 JSON 형태의 String으로 변환
        try {
            String userJson = objectMapper.writeValueAsString(socialUserInfoDto);

            // Redis에 Key: "oauth:register:{UUID}", Value: JSON 구조로 30분 만료 셋팅하여 저장
            String redisKey = Constants.OAUTH_TEMP_PREFIX + registerUUID;
            redisTemplate.opsForValue().set(redisKey, userJson, 30, java.util.concurrent.TimeUnit.MINUTES);

            return registerUUID; // 프론트에 돌려줄 표(티켓) 발급 완료

        } catch (Exception e) {
            log.error("Redis 소셜 유저 임시 저장 실패", e);
            throw new CustomException("소셜 로그인 진행 중 문제가 발생했습니다.", ErrorCode.OAUTH_TEMP_SAVE_FAILED);
        }
    }

    public SocialUserInfoDto getTempSocialUserFromRedis(String registerUUID) {
        String redisKey = Constants.OAUTH_TEMP_PREFIX + registerUUID;
        Object data = redisTemplate.opsForValue().get(redisKey);

        if (data == null) {
            throw new CustomException("세션이 만료되었습니다.", ErrorCode.OAUTH_SESSION_EXPIRED);
        }

        try {
            String userJson = (String) data;
            return objectMapper.readValue(userJson, SocialUserInfoDto.class);
        } catch (JsonProcessingException e) {
            log.error("JSON 파싱 에러", e);
            throw new CustomException("소셜 로그인 정보를 불러올 수 없습니다.", ErrorCode.OAUTH_TEMP_LOAD_FAILED);
        }
    }

    public void deleteTempSocialUser(String registerUUID) {
        String redisKey = Constants.OAUTH_TEMP_PREFIX + registerUUID;
        redisTemplate.delete(redisKey);
    }

    public void saveTempEmail(SocialUserInfoDto socialUserInfoDto){
        String redisKey = REDIS_EMAIL_AUTH_PREFIX + socialUserInfoDto.email();

        redisTemplate.opsForValue()
            .set(redisKey, "true", 30, java.util.concurrent.TimeUnit.MINUTES);
        log.info("OAuth 가입 대기 유저 이메일 자동 인증 처리됨: {}", socialUserInfoDto.email());
    }
}
