package com.ssafy.ssarvis.user.service;

import com.ssafy.ssarvis.user.dto.request.UserCreateRequestDto;
import com.ssafy.ssarvis.user.dto.request.UserUpdateRequestDto;
import com.ssafy.ssarvis.user.dto.response.UserResponseDto;
import com.ssafy.ssarvis.user.dto.response.UserUpdateResponseDto;


public interface UserService {

    void signupUser(UserCreateRequestDto userCreateRequestDto);

    boolean isAlreadyExistsEmail(String email);

    boolean isAlreadyExistsNickname(String nickname);

    UserResponseDto getUser(Long userId);

    UserUpdateResponseDto updateUser(Long userId, UserUpdateRequestDto userUpdateRequestDto);

    void deleteUser(Long userId);
}
