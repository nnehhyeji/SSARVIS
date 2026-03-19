package com.ssafy.ssarvis.auth.service;

import com.ssafy.ssarvis.auth.dto.request.LoginRequestDto;
import com.ssafy.ssarvis.auth.dto.TokenDto;
import com.ssafy.ssarvis.auth.dto.request.SetVoiceLockRequestDto;
import com.ssafy.ssarvis.auth.dto.response.VoicePasswordCheckResponse;

public interface AuthService {

    TokenDto login(LoginRequestDto loginRequestDto);

    void logout(String refreshToken);

    TokenDto reissue(String refreshToken);

    long getRefreshTokenMaxAgeSeconds();

    void setVoiceLockPassword(Long userId, SetVoiceLockRequestDto setVoiceLockRequestDto);

    VoicePasswordCheckResponse checkVoiceLockPassword(Long userId, SetVoiceLockRequestDto setVoiceLockRequestDto);

    VoicePasswordCheckResponse isUsedVoicePassword(Long userId);

    void deleteVoicePassword(Long userId);

}
