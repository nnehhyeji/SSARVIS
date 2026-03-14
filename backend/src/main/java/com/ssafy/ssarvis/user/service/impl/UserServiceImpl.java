package com.ssafy.ssarvis.user.service.impl;

import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.user.dto.request.UserCreateRequestDto;
import com.ssafy.ssarvis.user.dto.response.UserResponseDto;
import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
import com.ssafy.ssarvis.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void signupUser(UserCreateRequestDto userCreateRequestDto) {
        String encryptedPassword = passwordEncoder.encode(userCreateRequestDto.password());

        User newUser = User.create(
            userCreateRequestDto.email(),
            encryptedPassword,
            userCreateRequestDto.nickname(),
            userCreateRequestDto.profile_image()
        );

        userRepository.save(newUser);
    }

    @Override
    public boolean isAlreadyExistsEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    public boolean isAlreadyExistsNickname(String nickname) {
        return userRepository.existsByNickname(nickname);
    }

    @Override
    public UserResponseDto getUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));
        return UserResponseDto.from(user);
    }
}
