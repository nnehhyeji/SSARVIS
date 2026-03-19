package com.ssafy.ssarvis.auth.controller;

import com.ssafy.ssarvis.auth.dto.request.LoginRequestDto;
import com.ssafy.ssarvis.auth.dto.request.SetVoiceLockRequestDto;
import com.ssafy.ssarvis.auth.dto.response.AccessTokenResponseDto;
import com.ssafy.ssarvis.auth.dto.TokenDto;
import com.ssafy.ssarvis.auth.dto.response.VoicePasswordCheckResponse;
import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.auth.service.AuthService;
import com.ssafy.ssarvis.auth.util.CookieUtil;
import com.ssafy.ssarvis.common.constant.Constants;
import com.ssafy.ssarvis.common.dto.BaseResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final CookieUtil cookieUtil;

    @PostMapping("/login")
    public ResponseEntity<BaseResponse<AccessTokenResponseDto>> login(
        @Valid @RequestBody LoginRequestDto loginRequestDto
    ) {
        TokenDto tokenDto = authService.login(loginRequestDto);

        ResponseCookie refreshTokenCookie = cookieUtil.createRefreshTokenCookie(
            tokenDto.refreshToken(),
            authService.getRefreshTokenMaxAgeSeconds()
        );

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
            .header(HttpHeaders.AUTHORIZATION, Constants.BEARER_PREFIX + tokenDto.accessToken())
            .body(BaseResponse.success("로그인 성공", new AccessTokenResponseDto(tokenDto.accessToken()))
            );
    }

    @PostMapping("/reissue")
    public ResponseEntity<BaseResponse<AccessTokenResponseDto>> reissue(
        @CookieValue(name = "refreshToken", required = false) String refreshToken
    ) {
        TokenDto tokenDto = authService.reissue(refreshToken);

        ResponseCookie refreshTokenCookie = cookieUtil.createRefreshTokenCookie(
            tokenDto.refreshToken(),
            authService.getRefreshTokenMaxAgeSeconds()
        );

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
            .header(HttpHeaders.AUTHORIZATION, Constants.BEARER_PREFIX + tokenDto.accessToken())
            .body(BaseResponse.success("토큰 재발급 성공", new AccessTokenResponseDto(tokenDto.accessToken()))
            );
    }

    @PostMapping("/logout")
    public ResponseEntity<BaseResponse<Void>> logout(
        @CookieValue(name = "refreshToken", required = false) String refreshToken
    ) {
        authService.logout(refreshToken);

        ResponseCookie deleteCookie = cookieUtil.deleteRefreshTokenCookie();

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
            .body(BaseResponse.success("로그아웃 성공"));
    }

    @PatchMapping("/voice-lock")
    public ResponseEntity<BaseResponse<Void>> setVoiceLock(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestBody SetVoiceLockRequestDto setVoiceLockRequestDto
    ) {
        Long userId = customUserDetails.getUserId();
        authService.setVoiceLockPassword(userId, setVoiceLockRequestDto);
        return ResponseEntity.ok(BaseResponse.success("음성 인증 설정 완료"));
    }

    @PostMapping("/voice-lock")
    public ResponseEntity<BaseResponse<VoicePasswordCheckResponse>> checkVoiceLock(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestBody SetVoiceLockRequestDto setVoiceLockRequestDto
    ) {
        Long userId = customUserDetails.getUserId();
        VoicePasswordCheckResponse voicePasswordCheckResponse = authService.checkVoiceLockPassword(userId, setVoiceLockRequestDto);
        return ResponseEntity.ok(BaseResponse.success("음성 인증 요청", voicePasswordCheckResponse));
    }

}
