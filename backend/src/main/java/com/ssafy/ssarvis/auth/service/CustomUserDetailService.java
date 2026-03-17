package com.ssafy.ssarvis.auth.service;

import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailService implements UserDetailsService {

    private final UserRepository userRepository;

    // Spring Security 기본 메서드
    // 현재 사용 x, 확장성을 위해 CustomUserDetailService 하며 나둠
    @Deprecated
    @Override
    public CustomUserDetails loadUserByUsername(String username) {
        User user = userRepository.findByEmail(username)
            .orElseThrow(() -> new CustomException("회원 조회 실패", ErrorCode.USER_NOT_FOUND));

        return new CustomUserDetails(user.getId());
    }

    public CustomUserDetails loadUserById(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException("회원 조회 실패", ErrorCode.USER_NOT_FOUND));

        // TODO: 유저 withdrawStatus 조회 이후 탈퇴 유저시 처리
//        if(Boolean.TRUE.equals(user.getWithdrawStatus())){
//            throw new CustomException("탈퇴한 사용자입니다.", ErrorCode.USER_WITHDRAW);
//        }

        return new CustomUserDetails(user.getId());
    }
}