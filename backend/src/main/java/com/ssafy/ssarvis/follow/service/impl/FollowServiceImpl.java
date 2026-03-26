package com.ssafy.ssarvis.follow.service.impl;

import com.ssafy.ssarvis.assistant.entity.Assistant;
import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.assistant.repository.AssistantRepository;
import com.ssafy.ssarvis.chat.repository.ChatSessionRepository;
import com.ssafy.ssarvis.common.advice.CustomException;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import com.ssafy.ssarvis.follow.dto.request.FollowAcceptDto;
import com.ssafy.ssarvis.follow.dto.request.FollowListResponseDto;
import com.ssafy.ssarvis.follow.dto.request.FollowRejectDto;
import com.ssafy.ssarvis.follow.dto.request.FollowRequestDto;
import com.ssafy.ssarvis.follow.dto.response.FollowAiResponseDto;
import com.ssafy.ssarvis.follow.dto.response.FollowRequestListResponseDto;
import com.ssafy.ssarvis.follow.dto.response.FollowerListResponseDto;
import com.ssafy.ssarvis.follow.dto.response.UserSearchResponseDto;
import com.ssafy.ssarvis.follow.entity.Follow;
import com.ssafy.ssarvis.follow.entity.FollowRequest;
import com.ssafy.ssarvis.follow.entity.FollowStatus;
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
    private final NotificationService notificationService;
    private final AssistantRepository assistantRepository;
    private final ChatSessionRepository chatSessionRepository;
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

        followRepository.save(follow);
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

        followRepository.delete(myFollow);

        log.info("팔로우 삭제 완료 - 실행자(팔로워) PK: {}, 대상(팔로잉) PK: {}", userId, myFollow.getFollowing().getId());
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
                follow.getFollowing().getCustomId(),
                follow.getFollowing().getProfileImageUrl(),
                follow.getFollowing().getDescription()
            )).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<FollowRequestListResponseDto> getFollowRequestList(Long userId) {
        return followRequestRepository.findAllByReceiverId(userId)
            .stream()
            .map(req -> new FollowRequestListResponseDto(
                req.getId(),
                req.getSender().getId(),
                req.getSender().getNickname(),
                req.getSender().getEmail()
            ))
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserSearchResponseDto> searchUser(Long userId, String keyword) {

        if (keyword == null || keyword.isBlank()) {
            throw new CustomException("검색어를 입력해주세요.", ErrorCode.BAD_REQUEST);
        }

        return userRepository.findByNicknameOrCustomIdContaining(keyword)
            .stream()
            .filter(user -> !user.getId().equals(userId))
            .map(user -> new UserSearchResponseDto(
                user.getId(),
                user.getCustomId(),
                user.getNickname(),
                user.getEmail(),
                user.getProfileImageUrl(),
                resolveFollowStatus(userId, user.getId())
            ))
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public FollowAiResponseDto getFollowDailyAi(Long loginUserId, Long targetUserId) {
        Assistant assistant = assistantRepository
            .findByUserIdAndAssistantType(targetUserId, AssistantType.DAILY)
            .orElseThrow(() -> new CustomException("해당 유저의 DAILY AI가 없습니다.", ErrorCode.NOT_FOUND));

        User targetUser = userRepository.findById(targetUserId)
            .orElseThrow(() -> new CustomException("유저 조회 실패", ErrorCode.USER_NOT_FOUND));

        boolean isAccessible = false;

        if (targetUser.getIsPublic()) {
            isAccessible = true;
        }
        // Case B: 비공개(false)이지만, 로그인한 사용자가 대상을 팔로우 중인 경우
        else if (loginUserId != null) {
            isAccessible = followRepository.existsByFollowerIdAndFollowingId(loginUserId, targetUserId);
        }

        if (!isAccessible) {
            throw new CustomException("해당 AI에 접근할 권한이 없습니다.", ErrorCode.UNAUTHORIZED);
        }

        return FollowAiResponseDto.of(assistant, isAccessible);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FollowerListResponseDto> getFollowerList(Long userId) {
        List<Follow> followers = followRepository.findAllByFollowingIdWithFollower(userId);

        return followers.stream()
            .map(follow -> new FollowerListResponseDto(
                follow.getId(),
                follow.getFollower().getId(),
                follow.getFollower().getNickname(),
                follow.getFollower().getCustomId(),
                follow.getFollower().getProfileImageUrl(),
                follow.getFollower().getDescription()
            )).toList();
    }

    private FollowStatus resolveFollowStatus(Long myId, Long targetId) {
        if (followRepository.existsByFollowerIdAndFollowingId(myId, targetId)) {
            return FollowStatus.FOLLOWING;
        }
        if (followRequestRepository.existsBySenderIdAndReceiverId(myId, targetId)) {
            return FollowStatus.REQUESTED;
        }
        return FollowStatus.NONE;
    }


}
