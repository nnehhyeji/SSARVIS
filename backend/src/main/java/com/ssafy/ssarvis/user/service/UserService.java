package com.ssafy.ssarvis.user.service;

import com.ssafy.ssarvis.user.dto.request.UserCreateRequestDto;
import com.ssafy.ssarvis.user.dto.request.UserUpdateRequestDto;
import com.ssafy.ssarvis.user.dto.response.UserResponseDto;
import com.ssafy.ssarvis.user.dto.response.UserUpdateResponseDto;
import org.springframework.web.multipart.MultipartFile;


public interface UserService {

    void signupUser(UserCreateRequestDto userCreateRequestDto);

    boolean isAlreadyExistsEmail(String email);

    boolean isAlreadyExistsCustomId(String customId);

    UserResponseDto getUser(Long userId);

    UserUpdateResponseDto updateUser(Long userId, UserUpdateRequestDto userUpdateRequestDto);

    void deleteUser(Long userId);

    boolean toggleNamna(Long userId);

    boolean updateProfileVisibility(Long userId, boolean isPublic);

    String updateProfileImage(Long userId, MultipartFile profileImage);

    void sendVerificationEmail(String email);

    boolean verifyEmailCode(String email, String code);

    void deleteProfileImage(Long userId);

}
