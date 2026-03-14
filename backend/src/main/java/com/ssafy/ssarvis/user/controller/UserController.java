package com.ssafy.ssarvis.user.controller;

import com.ssafy.ssarvis.common.dto.BaseResponse;
import com.ssafy.ssarvis.user.dto.request.UserCreateRequestDto;
import com.ssafy.ssarvis.user.dto.request.UserEmailCheckRequestDto;
import com.ssafy.ssarvis.user.dto.request.UserNicknameCheckRequestDto;
import com.ssafy.ssarvis.user.dto.request.UserUpdateRequestDto;
import com.ssafy.ssarvis.user.dto.response.DuplicateCheckResponseDto;
import com.ssafy.ssarvis.user.dto.response.UserResponseDto;
import com.ssafy.ssarvis.user.dto.response.UserUpdateResponseDto;
import com.ssafy.ssarvis.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<BaseResponse<Void>> signup(UserCreateRequestDto userCreateRequestDto) {
        userService.signupUser(userCreateRequestDto);
        return ResponseEntity.ok(BaseResponse.success("회원가입 성공"));
    }

    @PostMapping("/check-email")
    public ResponseEntity<BaseResponse<DuplicateCheckResponseDto>> isEmailAlreadyExists(
        @RequestBody UserEmailCheckRequestDto userEmailCheckRequestDto
    ) {
        boolean isDuplicate = userService.isAlreadyExistsEmail(
            userEmailCheckRequestDto.email());
        return ResponseEntity.ok(
            BaseResponse.success("이메일 중복 확인 조회 성공", DuplicateCheckResponseDto.from(isDuplicate)));
    }

    @PostMapping("/check-nickname")
    public ResponseEntity<BaseResponse<DuplicateCheckResponseDto>> isNicknameAlreadyExists(
        @RequestBody UserNicknameCheckRequestDto userNicknameCheckRequestDto
    ) {
        boolean isDuplicate = userService.isAlreadyExistsNickname(
            userNicknameCheckRequestDto.nickname());
        return ResponseEntity.ok(
            BaseResponse.success("닉네임 중복 확인 조회 성공", DuplicateCheckResponseDto.from(isDuplicate)));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<UserResponseDto>> getUser(
        @AuthenticationPrincipal Long userId
    ){
        UserResponseDto userResponseDto = userService.getUser(userId);
        return ResponseEntity.ok(
            BaseResponse.success("유저 조회 성공", userResponseDto));
    }

    @PatchMapping
    public ResponseEntity<BaseResponse<UserUpdateResponseDto>> updateUser(
        @AuthenticationPrincipal Long userId,
        @RequestBody UserUpdateRequestDto userUpdateRequestDto
    ){
        UserUpdateResponseDto userUpdateResponseDto = userService.updateUser(userId, userUpdateRequestDto);
        return ResponseEntity.ok(
            BaseResponse.success("유저 수정 성공", userUpdateResponseDto));
    }

    @DeleteMapping
    public ResponseEntity<BaseResponse<Void>> deleteUser(
        @AuthenticationPrincipal Long userId
    ){
        userService.deleteUser(userId);
        return ResponseEntity.ok(
            BaseResponse.success("유저 삭제 성공"));
    }
}
