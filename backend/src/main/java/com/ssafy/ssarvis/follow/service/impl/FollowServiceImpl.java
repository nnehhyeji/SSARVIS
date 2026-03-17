package com.ssafy.ssarvis.follow.service.impl;

import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.follow.dto.request.FollowRequestDto;
import com.ssafy.ssarvis.follow.entity.FollowRequest;
import com.ssafy.ssarvis.follow.repository.FollowRepository;
import com.ssafy.ssarvis.follow.repository.FollowRequestRepository;
import com.ssafy.ssarvis.follow.service.FollowService;
import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class FollowServiceImpl implements FollowService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final FollowRequestRepository followRequestRepository;

    @Override
    public void requestFollow(Long senderId, FollowRequestDto followRequestDto) {

        Long receiverId = followRequestDto.receiverId();

        if (senderId.equals(receiverId)) {
            throw new CustomException(ErrorCode.CANNOT_FOLLOW_SELF.getMessage(), ErrorCode.CANNOT_FOLLOW_SELF);
        }

        if (followRepository.existsByFollowerIdAndFollowingId(senderId, receiverId)) {
            throw new CustomException(ErrorCode.ALREADY_FOLLOWING.getMessage(), ErrorCode.ALREADY_FOLLOWING);
        }

        if (followRequestRepository.existsBySenderIdAndReceiverId(senderId, receiverId)) {
            throw new CustomException(ErrorCode.ALREADY_REQUESTED_FOLLOW.getMessage(), ErrorCode.ALREADY_REQUESTED_FOLLOW);
        }

        User sender = userRepository.findById(senderId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));
        User receiver = userRepository.findById(receiverId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));

        FollowRequest followRequest = FollowRequest.builder()
            .sender(sender)
            .receiver(receiver)
            .build();

        followRequestRepository.save(followRequest);
        log.info("친구 신청 완료 - 신청자 PK: {}, 요청 타겟 PK: {}", senderId, receiverId);
    }

}
