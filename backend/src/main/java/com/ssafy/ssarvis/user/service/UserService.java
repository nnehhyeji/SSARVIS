package com.ssafy.ssarvis.user.service;

import com.ssafy.ssarvis.user.dto.request.UserCreateRequestDto;


public interface UserService {

    void signupUser(UserCreateRequestDto userCreateRequestDto);

    boolean isAlreadyExistsEmail(String email);

    boolean isAlreadyExistsNickname(String nickname);

}
