package com.ssafy.ssarvis.auth.service.impl;

import com.ssafy.ssarvis.auth.dto.OAuthDto;
import com.ssafy.ssarvis.auth.dto.TokenDto;
import com.ssafy.ssarvis.auth.dto.request.LoginRequestDto;
import com.ssafy.ssarvis.auth.dto.request.SetVoiceLockRequestDto;
import com.ssafy.ssarvis.auth.dto.response.OAuthResponseDto;
import com.ssafy.ssarvis.auth.dto.response.SocialUserInfoDto;
import com.ssafy.ssarvis.auth.dto.response.VoicePasswordCheckResponse;
import com.ssafy.ssarvis.auth.service.OAuthService;
import com.ssafy.ssarvis.auth.util.JwtUtil;
import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.auth.service.AuthService;
import com.ssafy.ssarvis.auth.service.RefreshTokenService;
import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.user.entity.SocialUser;
import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.SocialUserRepository;
import com.ssafy.ssarvis.user.repository.UserRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final RefreshTokenService refreshTokenService;
    private final OAuthService oAuthService;
    private final UserRepository userRepository;
    private final SocialUserRepository socialUserRepository;
    private final JwtUtil jwtUtil;

    @Transactional(readOnly = true)
    @Override
    public TokenDto login(LoginRequestDto loginRequestDto) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequestDto.email(),
                    loginRequestDto.password()
                )
            );

            Long userId = extractUserId(authentication);
            log.info("userId = {}", userId);
            String accessToken = jwtUtil.createAccessToken(userId);
            String refreshToken = jwtUtil.createRefreshToken(userId);

            refreshTokenService.save(
                userId,
                refreshToken,
                getRefreshTokenMaxAgeSeconds()
            );

            User user = userRepository.findById(userId).
                orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND.getMessage(),
                    ErrorCode.USER_NOT_FOUND));

            return TokenDto.from(accessToken, refreshToken, user.getVoiceLockTimeout());

        } catch (BadCredentialsException e) {
            throw new CustomException("이메일 또는 비밀번호가 올바르지 않습니다.", ErrorCode.LOGIN_FAILED);
        } catch (DisabledException e) {
            throw new CustomException("탈퇴한 사용자입니다.", ErrorCode.USER_WITHDRAW);
        } catch (AuthenticationException e) {
            throw new CustomException("인증에 실패했습니다.", ErrorCode.LOGIN_FAILED);
        }
    }

    @Override
    public void logout(String refreshToken) {
        if (!StringUtils.hasText(refreshToken)) {
            return;
        }

        if (!jwtUtil.validateToken(refreshToken)) {
            return;
        }

        Long userId = jwtUtil.getUserId(refreshToken);
        refreshTokenService.delete(userId);
    }

    @Override
    public TokenDto reissue(String refreshToken) {
        if (!StringUtils.hasText(refreshToken)) {
            throw new CustomException("리프레시 토큰이 없습니다.", ErrorCode.REFRESH_TOKEN_NOT_FOUND);
        }

        if (!jwtUtil.validateToken(refreshToken)) {
            throw new CustomException("리프레시 토큰이 만료되었습니다. 재로그인 필요", ErrorCode.REFRESH_TOKEN_EXPIRED);
        }

        Long userId = jwtUtil.getUserId(refreshToken);
        if (!refreshTokenService.matches(userId, refreshToken)) {
            throw new CustomException("리프레시 토큰이 일치하지 않습니다.", ErrorCode.INVALID_REFRESH_TOKEN);
        }

        String newAccessToken = jwtUtil.createAccessToken(userId);
        String newRefreshToken = jwtUtil.createRefreshToken(userId);

        refreshTokenService.save(
            userId,
            newRefreshToken,
            getRefreshTokenMaxAgeSeconds()
        );

        User user = userRepository.findById(userId).
            orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND.getMessage(),
                ErrorCode.USER_NOT_FOUND));

        return TokenDto.from(newAccessToken, newRefreshToken, user.getVoiceLockTimeout());
    }

    @Override
    public long getRefreshTokenMaxAgeSeconds() {
        return jwtUtil.getRefreshTokenExpireTimeMillis() / 1000;
    }

    @Override
    public void setVoiceLockPassword(Long userId, SetVoiceLockRequestDto setVoiceLockRequestDto) {

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));

        String cleanedPassword = ""; // 공백제거
        if (setVoiceLockRequestDto.voicePassword() != null) {
            cleanedPassword = setVoiceLockRequestDto.voicePassword().replaceAll("\\s+", "");
        }

        user.updateUserVoicePassword(cleanedPassword, setVoiceLockRequestDto.timeout());
    }

    @Override
    public VoicePasswordCheckResponse checkVoiceLockPassword(Long userId,
        SetVoiceLockRequestDto setVoiceLockRequestDto) {

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));

        String cleanedPassword = ""; // 공백제거
        if (setVoiceLockRequestDto.voicePassword() != null) {
            cleanedPassword = setVoiceLockRequestDto.voicePassword().replaceAll("\\s+", "");
        }

        boolean checked = user.getVoicePassword().equals(cleanedPassword);

        return new VoicePasswordCheckResponse(checked);
    }

    @Override
    public VoicePasswordCheckResponse isUsedVoicePassword(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));
        return new VoicePasswordCheckResponse(user.getIsVoiceLockActive());
    }

    @Override
    public void deleteVoicePassword(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));
        user.deleteUserVoicePassword();
    }

    @Override
    public OAuthResponseDto loginOrSignUpWithOauth2(String provider, String authorizationCode) {
        // authorization code로 Oauth provider의 accessToken 발급
        String oauthAccessToken = null;
        SocialUserInfoDto socialUserInfoDto = null;

        if ("kakao".equalsIgnoreCase(provider)) {
            oauthAccessToken = oAuthService.getKakaoAccessToken(authorizationCode);
            socialUserInfoDto = oAuthService.getKakaoUserInfo(oauthAccessToken);
        } else {
            throw new CustomException("지원하지 않는 소셜 로그인 제공자입니다.", ErrorCode.UNSUPPORTED_PROVIDER);
        }

        String email = socialUserInfoDto.email();
        Optional<User> optionalUser = userRepository.findByEmail(email);

        if (optionalUser.isPresent()) {
            // 존재 O -> 기존 가입 유저 (바로 로그인 처리)
            User existingUser = optionalUser.get();

            boolean isAlreadySocialSignup = socialUserRepository.existsByUser(existingUser);
            if (!isAlreadySocialSignup) {
                socialUserRepository.save(
                    SocialUser.create(
                        socialUserInfoDto.provider(),
                        socialUserInfoDto.providerId(),
                        existingUser));
            }

            String accessToken = jwtUtil.createAccessToken(existingUser.getId());
            String refreshToken = jwtUtil.createRefreshToken(existingUser.getId());
            refreshTokenService.save(existingUser.getId(), refreshToken,
                getRefreshTokenMaxAgeSeconds());

            return !isAlreadySocialSignup ?
                OAuthResponseDto.loginAndLinkUserResponse(
                    accessToken,
                    optionalUser.get().getVoiceLockTimeout())

                : OAuthResponseDto.loginUserResponse(
                    accessToken,
                    optionalUser.get().getVoiceLockTimeout()
                );

        } else {
            // 존재 X -> 회원가입 페이지 처리 유도
            // Redis에 소셜 유저 정보(이메일, 닉네임, 프사 등)를 30분간 담아두고 UUID 제공
            String registerUUID = oAuthService.saveTempSocialUserToRedis(socialUserInfoDto);

            // 응답: 회원가입 전 임시 발급된 UUID만 프론트엔드로 내려 줌
            return OAuthResponseDto.signupUserResponse(
                registerUUID,
                socialUserInfoDto.nickname(),
                socialUserInfoDto.profileImageUrl(),
                socialUserInfoDto.email()
            );
        }
    }

    private Long extractUserId(Authentication authentication) {
        Object principal = authentication.getPrincipal();

        if (principal instanceof CustomUserDetails userDetails) {
            return userDetails.getUserId();
        }
        throw new CustomException("인증 정보 추출 실패", ErrorCode.INTERNAL_SERVER_ERROR);
    }
}
