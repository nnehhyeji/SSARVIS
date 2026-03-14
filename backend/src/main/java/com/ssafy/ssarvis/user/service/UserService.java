package com.ssafy.ssarvis.user.service;

import com.ssafy.ssarvis.user.dto.request.UserCreateRequestDto;
import com.ssafy.ssarvis.user.dto.response.UserResponseDto;


public interface UserService {

    void signupUser(UserCreateRequestDto userCreateRequestDto);

    boolean isAlreadyExistsEmail(String email);

    boolean isAlreadyExistsNickname(String nickname);

    UserResponseDto getUser(Long userId);

    void deleteUser(Long userId);
}
