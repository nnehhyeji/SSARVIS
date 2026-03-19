package com.ssafy.ssarvis.follow.service.impl;

import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.follow.dto.request.FollowAcceptDto;
import com.ssafy.ssarvis.follow.dto.request.FollowListResponseDto;
import com.ssafy.ssarvis.follow.dto.request.FollowRejectDto;
import com.ssafy.ssarvis.follow.dto.request.FollowRequestDto;
import com.ssafy.ssarvis.follow.entity.Follow;
import com.ssafy.ssarvis.follow.entity.FollowRequest;
import com.ssafy.ssarvis.follow.repository.FollowRepository;
import com.ssafy.ssarvis.follow.repository.FollowRequestRepository;
import com.ssafy.ssarvis.follow.service.FollowService;
import com.ssafy.ssarvis.notification.service.NotificationService;
import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class FollowServiceImpl implements FollowService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final FollowRequestRepository followRequestRepository;
    private final NotificationService notificationService;

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

        notificationService.sendFollowRequestNotification(sender, receiver);
        log.info("친구 신청 완료 - 신청자 PK: {}, 요청 타겟 PK: {}", senderId, receiverId);
    }

    @Override
    public void acceptFollow(Long receiverId, FollowAcceptDto followAcceptDto) {

        Long followRequestId = followAcceptDto.followRequestId();

        FollowRequest followRequest = followRequestRepository
            .findByIdAndReceiverId(followRequestId, receiverId)
            .orElseThrow(() -> new CustomException(ErrorCode.FOLLOW_REQUEST_NOT_FOUND.getMessage(), ErrorCode.FOLLOW_NOT_FOUND));

        Follow follow = Follow.builder()
            .follower(followRequest.getSender())
            .following(followRequest.getReceiver())
            .build();

        Follow follower = Follow.builder()
            .follower(followRequest.getReceiver())
            .following(followRequest.getSender())
            .build();

        followRepository.save(follow);
        followRepository.save(follower);
        followRequestRepository.delete(followRequest);

        notificationService.sendFollowAcceptNotification(followRequest.getSender(), followRequest.getReceiver());

        log.info("친구 수락 완료 - 요청자 PK: {}, 응답자 PK: {}",
            followRequest.getSender().getId(), receiverId);
    }

    @Override
    public void rejectFollow(Long receiverId, FollowRejectDto followRejectDto) {

        Long followRequestId = followRejectDto.followRequestId();

        FollowRequest followRequest = followRequestRepository
            .findByIdAndReceiverId(followRequestId, receiverId)
            .orElseThrow(() -> new CustomException(ErrorCode.FOLLOW_REQUEST_NOT_FOUND.getMessage(), ErrorCode.FOLLOW_NOT_FOUND));

        followRequestRepository.delete(followRequest);
        log.info("친구 거절 완료 - 요청자 PK: {}, 응답자 PK: {}",
            followRequest.getSender().getId(), receiverId);
    }

    @Override
    public void deleteFollow(Long userId, Long followId) {

        Follow myFollow = followRepository.findByIdAndFollowerIdOrFollowingId(followId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.FOLLOW_REQUEST_NOT_FOUND.getMessage(), ErrorCode.FOLLOW_NOT_FOUND));

        Long otherUserId = myFollow.getFollower().getId().equals(userId)
            ? myFollow.getFollowing().getId()
            : myFollow.getFollower().getId();

        List<Follow> bothFollows = followRepository.findBothFollows(userId, otherUserId);
        followRepository.deleteAll(bothFollows);

        log.info("친구 삭제 완료 - 요청자 PK: {}, 상대방 PK: {}", userId, otherUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FollowListResponseDto> getFollowList(Long followerId) {
        List<Follow> follows = followRepository.findAllByFollowerId(followerId);

        return follows.stream()
            .map(follow -> new FollowListResponseDto(
                follow.getId(),
                follow.getFollowing().getId(),
                follow.getFollowing().getNickname(),
                follow.getFollowing().getDescription()
            )).toList();
    }
}
