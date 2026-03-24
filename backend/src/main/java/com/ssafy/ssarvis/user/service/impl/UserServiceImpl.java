package com.ssafy.ssarvis.user.service.impl;

import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.constant.Constants;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.common.service.S3Uploader;
import com.ssafy.ssarvis.user.dto.request.UserCreateRequestDto;
import com.ssafy.ssarvis.user.dto.request.UserUpdateRequestDto;
import com.ssafy.ssarvis.user.dto.response.UserResponseDto;
import com.ssafy.ssarvis.user.dto.response.UserUpdateResponseDto;
import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
import com.ssafy.ssarvis.user.service.UserService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final S3Uploader s3Uploader;

    private final JavaMailSender mailSender; // 메일 발송용
    private final StringRedisTemplate redisTemplate; // Redis 활용

    @Value("${spring.app.s3.cloudfront-domain}")
    private String cloudFrontDomain;

    @Transactional
    @Override
    public void signupUser(UserCreateRequestDto userCreateRequestDto) {

        if (isAlreadyExistsEmail(userCreateRequestDto.email())) {
            throw new CustomException("이메일 중복", ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        String isVerified = redisTemplate.opsForValue().get(Constants.VERIFIED_EMAIL_PREFIX + userCreateRequestDto.email());
        if (isVerified == null || !isVerified.equals("true")) {
            throw new CustomException("이메일 인증이 필요합니다.", ErrorCode.INVALID_PARAMETER);
        }

        if (isAlreadyExistsNickname(userCreateRequestDto.nickname())) {
            throw new CustomException("닉네임 중복", ErrorCode.NICKNAME_ALREADY_EXISTS);
        }

        String encryptedPassword = passwordEncoder.encode(userCreateRequestDto.password());
        User newUser = User.create(userCreateRequestDto.email(), encryptedPassword, userCreateRequestDto.nickname());
        userRepository.save(newUser);

        redisTemplate.delete(Constants.VERIFIED_EMAIL_PREFIX + userCreateRequestDto.email());
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
    @Override
    public String updateProfileImage(Long userId, MultipartFile profileImage) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));

        // 1. 기존 이미지가 있다면 삭제 (URL을 그대로 넘기면 S3Uploader가 내부에서 키를 추출함)
        if (user.getProfileImageUrl() != null) {
            s3Uploader.delete(user.getProfileImageUrl());
        }

        // 2. S3에 업로드하고 CloudFront URL을 바로 받아옴
        String cloudFrontUrl = s3Uploader.upload(profileImage, "profiles");

        // 3. DB에 업데이트 및 반환
        user.updateProfileImage(cloudFrontUrl);

        return cloudFrontUrl;
    }

    @Override
    public void sendVerificationEmail(String email) {
        if (isAlreadyExistsEmail(email)) {
            throw new CustomException("이미 존재하는 이메일입니다.", ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        String code = String.format("%06d", new Random().nextInt(1000000));

        // Redis에 5분간 코드 저장
        redisTemplate.opsForValue().set(Constants.VERIFY_CODE_PREFIX + email, code, 5, TimeUnit.MINUTES);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(email);
            helper.setSubject("[SSARVIS] 회원가입 인증 번호입니다.");
            helper.setText("인증 번호: " + code, true);
            mailSender.send(message);
        } catch (Exception e) {
            throw new CustomException("메일 발송 실패", ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public boolean verifyEmailCode(String email, String code) {
        String savedCode = redisTemplate.opsForValue().get(Constants.VERIFY_CODE_PREFIX + email);

        if (savedCode != null && savedCode.equals(code)) {
            redisTemplate.opsForValue().set(Constants.VERIFIED_EMAIL_PREFIX + email, "true", 10, TimeUnit.MINUTES);
            redisTemplate.delete(Constants.VERIFY_CODE_PREFIX + email);
            return true;
        }
        return false;
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

    @Override
    public boolean toggleProfile(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));
        user.toggleProfile();
        return user.getIsPublic();
    }

}
