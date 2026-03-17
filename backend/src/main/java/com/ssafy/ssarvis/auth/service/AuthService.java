package com.ssafy.ssarvis.auth.service;

import com.ssafy.ssarvis.auth.dto.request.LoginRequestDto;
import com.ssafy.ssarvis.auth.dto.TokenDto;

public interface AuthService {

    TokenDto login(LoginRequestDto loginRequestDto);

    void logout(String refreshToken);

    TokenDto reissue(String refreshToken);

    long getRefreshTokenMaxAgeSeconds();

}
