package com.ssafy.ssarvis.user.controller;

import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.auth.service.AuthService;
import com.ssafy.ssarvis.auth.util.CookieUtil;
import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.dto.BaseResponse;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.user.dto.request.*;
import com.ssafy.ssarvis.user.dto.response.DuplicateCheckResponseDto;
import com.ssafy.ssarvis.user.dto.response.UserResponseDto;
import com.ssafy.ssarvis.user.dto.response.UserUpdateResponseDto;
import com.ssafy.ssarvis.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final AuthService authService;
    private final CookieUtil cookieUtil;

    @PostMapping
    public ResponseEntity<BaseResponse<Void>> signup(
        @RequestBody @Valid UserCreateRequestDto userCreateRequestDto
    ) {
        userService.signupUser(userCreateRequestDto);
        return ResponseEntity.ok(BaseResponse.success("회원가입 성공"));
    }

    @PostMapping("/check-email")
    public ResponseEntity<BaseResponse<DuplicateCheckResponseDto>> isEmailAlreadyExists(
        @RequestBody @Valid UserEmailCheckRequestDto userEmailCheckRequestDto
    ) {
        boolean isDuplicate = userService.isAlreadyExistsEmail(
            userEmailCheckRequestDto.email());
        return ResponseEntity.ok(
            BaseResponse.success("이메일 중복 확인 조회 성공", DuplicateCheckResponseDto.from(isDuplicate)));
    }

    @PostMapping("/check-customId")
    public ResponseEntity<BaseResponse<DuplicateCheckResponseDto>> isCustomIdAlreadyExists(
        @RequestBody @Valid UserCustomIdCheckRequestDto userCustomIdCheckRequestDto
    ) {
        boolean isDuplicate = userService.isAlreadyExistsCustomId(
            userCustomIdCheckRequestDto.customId());
        return ResponseEntity.ok(
            BaseResponse.success("아이디 중복 확인 조회 성공", DuplicateCheckResponseDto.from(isDuplicate)));
    }

    @PostMapping("/email/verification")
    public ResponseEntity<BaseResponse<Void>> sendVerificationCode(
        @RequestBody @Valid UserEmailCheckRequestDto requestDto
    ) {
        userService.sendVerificationEmail(requestDto.email());
        return ResponseEntity.ok(BaseResponse.success("인증 코드가 발송되었습니다."));
    }

    @PostMapping("/email/verify")
    public ResponseEntity<BaseResponse<Void>> verifyCode(
        @RequestBody UserVerifyRequestDto userVerifyRequestDto
    ) {
        boolean isVerified = userService.verifyEmailCode(userVerifyRequestDto.email(), userVerifyRequestDto.code());
        if (isVerified) {
            return ResponseEntity.ok(BaseResponse.success("이메일 인증 성공"));
        } else {
            throw new CustomException("인증 번호가 일치하지 않습니다.", ErrorCode.INVALID_PARAMETER);
        }
    }

    @GetMapping
    public ResponseEntity<BaseResponse<UserResponseDto>> getUser(
        @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        UserResponseDto userResponseDto = userService.getUser(customUserDetails.getUserId());
        return ResponseEntity.ok(
            BaseResponse.success("유저 조회 성공", userResponseDto));
    }

    @PatchMapping
    public ResponseEntity<BaseResponse<UserUpdateResponseDto>> updateUser(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestBody @Valid UserUpdateRequestDto userUpdateRequestDto
    ) {
        UserUpdateResponseDto userUpdateResponseDto = userService.updateUser(customUserDetails.getUserId(), userUpdateRequestDto);
        return ResponseEntity.ok(
            BaseResponse.success("유저 수정 성공", userUpdateResponseDto));
    }

    @DeleteMapping
    public ResponseEntity<BaseResponse<Void>> deleteUser(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @CookieValue(name = "refreshToken", required = false) String refreshToken
    ) {
        userService.deleteUser(customUserDetails.getUserId());
        authService.logout(refreshToken);

        ResponseCookie deleteCookie = cookieUtil.deleteRefreshTokenCookie();

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
            .body(BaseResponse.success("유저 탈퇴 성공"));
    }

    @GetMapping("/namna/toggle")
    public ResponseEntity<BaseResponse<Boolean>> toggleNamnaStatus(
        @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        boolean result = userService.toggleNamna(customUserDetails.getUserId());
        return ResponseEntity.ok(BaseResponse.success(String.valueOf(result)));
    }

    @PatchMapping("/profile/toggle")
    public ResponseEntity<BaseResponse<Boolean>> updateProfileStatus(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestBody @Valid UserProfileVisibilityUpdateRequestDto requestDto
    ) {
        boolean result = userService.updateProfileVisibility(customUserDetails.getUserId(), requestDto.isPublic());
        return ResponseEntity.ok(BaseResponse.success(String.valueOf(result)));
    }

    @PatchMapping(value = "/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BaseResponse<String>> updateProfileImage(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestPart("profileImage") MultipartFile profileImage
    ) {
        String imageUrl = userService.updateProfileImage(customUserDetails.getUserId(), profileImage);
        return ResponseEntity.ok(BaseResponse.success("프로필 이미지 수정 성공", imageUrl));
    }

}
