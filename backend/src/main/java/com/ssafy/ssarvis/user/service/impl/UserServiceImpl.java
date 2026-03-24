package com.ssafy.ssarvis.user.service.impl;

import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.common.service.S3Uploader;
import com.ssafy.ssarvis.user.dto.request.UserCreateRequestDto;
import com.ssafy.ssarvis.user.dto.request.UserUpdateRequestDto;
import com.ssafy.ssarvis.user.dto.response.UserResponseDto;
import com.ssafy.ssarvis.user.dto.response.UserUpdateResponseDto;
import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
import com.ssafy.ssarvis.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Slf4j
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final S3Uploader s3Uploader;

    @Transactional
    @Override
    public void signupUser(UserCreateRequestDto userCreateRequestDto) {
        if (isAlreadyExistsEmail(userCreateRequestDto.email())) {
            throw new CustomException("이메일 중복", ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        if (isAlreadyExistsNickname(userCreateRequestDto.nickname())) {
            throw new CustomException("닉네임 중복", ErrorCode.NICKNAME_ALREADY_EXISTS);
        }

        String encryptedPassword = passwordEncoder.encode(userCreateRequestDto.password());

        User newUser = User.create(
            userCreateRequestDto.email(),
            encryptedPassword,
            userCreateRequestDto.nickname()
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

    @Transactional
    public String updateProfileImage(Long userId, MultipartFile profileImage) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));

        if (user.getProfileImageUrl() != null) {
            s3Uploader.delete(user.getProfileImageUrl());
        }

        String newImageUrl = s3Uploader.upload(profileImage, "profiles");
        user.updateProfileImage(newImageUrl);

        return newImageUrl;
    }

    @Transactional
    @Override
    public UserUpdateResponseDto updateUser(Long userId, UserUpdateRequestDto userUpdateRequestDto) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));

        user.update(
            trimToNull(userUpdateRequestDto.password()),
            trimToNull(userUpdateRequestDto.nickname()),
            trimToNull(userUpdateRequestDto.description()),
            userUpdateRequestDto.costume(),
            trimToNull(userUpdateRequestDto.voicePassword())
        );

        return new UserUpdateResponseDto(userId);
    }

    @Transactional
    @Override
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));
        user.deleteUser();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            throw new CustomException("공백 문자열은 허용되지 않습니다.", ErrorCode.INVALID_PARAMETER);
        }
        return trimmed;
    }

    @Override
    @Transactional
    public boolean toggleNamna(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));
        user.toggleAcceptPrompt();
        return user.getIsAcceptPrompt();
    }

}
