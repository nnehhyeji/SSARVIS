package com.ssafy.ssarvis.auth.service.impl;

import com.ssafy.ssarvis.auth.dto.TokenDto;
import com.ssafy.ssarvis.auth.dto.request.LoginRequestDto;
import com.ssafy.ssarvis.auth.dto.request.SetVoiceLockRequestDto;
import com.ssafy.ssarvis.auth.dto.response.VoicePasswordCheckResponse;
import com.ssafy.ssarvis.auth.util.JwtUtil;
import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.auth.service.AuthService;
import com.ssafy.ssarvis.auth.service.RefreshTokenService;
import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
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
    private final UserRepository userRepository;
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

            return TokenDto.from(accessToken, refreshToken);

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

        return TokenDto.from(newAccessToken, newRefreshToken);
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

        user.updateUserVoicePassword(cleanedPassword);
    }

    @Override
    public VoicePasswordCheckResponse checkVoiceLockPassword(Long userId, SetVoiceLockRequestDto setVoiceLockRequestDto) {

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));

        String cleanedPassword = ""; // 공백제거
        if (setVoiceLockRequestDto.voicePassword() != null) {
            cleanedPassword = setVoiceLockRequestDto.voicePassword().replaceAll("\\s+", "");
        }

        boolean checked = user.getVoicePassword().equals(cleanedPassword);

        return new VoicePasswordCheckResponse(checked);
    }

    private Long extractUserId(Authentication authentication) {
        Object principal = authentication.getPrincipal();

        if (principal instanceof CustomUserDetails userDetails) {
            return userDetails.getUserId();
        }
        throw new CustomException("인증 정보 추출 실패", ErrorCode.INTERNAL_SERVER_ERROR);
    }
}
