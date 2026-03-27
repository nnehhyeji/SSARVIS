package com.ssafy.ssarvis.follow.service.impl;

import com.ssafy.ssarvis.assistant.entity.Assistant;
import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.assistant.repository.AssistantRepository;
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
import java.util.Set;
import java.util.stream.Collectors;
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
    private final FollowRequestRepository followRequestRepository;

    @Override
    public void requestFollow(Long senderId, FollowRequestDto followRequestDto) {
        Long receiverId = followRequestDto.receiverId();

        // 자기 자신 팔로우 체크
        if (senderId.equals(receiverId)) {
            throw new CustomException(ErrorCode.CANNOT_FOLLOW_SELF.getMessage(), ErrorCode.CANNOT_FOLLOW_SELF);
        }

        // 이미 팔로우 중인지 체크
        if (followRepository.existsByFollowerIdAndFollowingId(senderId, receiverId)) {
            throw new CustomException(ErrorCode.ALREADY_FOLLOWING.getMessage(), ErrorCode.ALREADY_FOLLOWING);
        }

        // 이미 요청 중인지 체크
        if (followRequestRepository.existsBySenderIdAndReceiverId(senderId, receiverId)) {
            throw new CustomException(ErrorCode.ALREADY_REQUESTED_FOLLOW.getMessage(), ErrorCode.ALREADY_REQUESTED_FOLLOW);
        }

        User sender = userRepository.findById(senderId).orElseThrow(()-> new CustomException("존재하지 않는 유저입니다.", ErrorCode.USER_NOT_FOUND));
        User receiver = userRepository.findById(receiverId).orElseThrow(()-> new CustomException("존재하지 않는 유저입니다.", ErrorCode.USER_NOT_FOUND));

        //  공개 여부에 따른 조건부 처리
        if (Boolean.TRUE.equals(receiver.getIsPublic())) {
            // 공개 계정: 즉시 팔로우 관계 생성
            Follow follow = Follow.builder()
                .follower(sender)
                .following(receiver)
                .build();
            followRepository.save(follow);

            // 알림 전송: "A님이 회원님을 팔로우했습니다." (즉시 완료 알림)
            notificationService.sendFollowAcceptNotification(sender, receiver, follow.getId());
        } else {
            // 비공개 계정: 기존처럼 팔로우 요청 생성
            FollowRequest followRequest = FollowRequest.builder()
                .sender(sender)
                .receiver(receiver)
                .build();
            followRequestRepository.save(followRequest);

            // 알림 전송: "A님이 팔로우 요청을 보냈습니다."
            notificationService.sendFollowRequestNotification(sender, receiver, followRequest.getId());
        }
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

        notificationService.sendFollowAcceptNotification(followRequest.getSender(), followRequest.getReceiver(), follow.getId());

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

        List<User> results = userRepository.findByNicknameOrCustomIdContaining(keyword)
            .stream()
            .filter(user -> !user.getId().equals(userId))
            .toList();

        // 결과 유저 ID 추출
        Set<Long> targetIds = results.stream().map(User::getId).collect(Collectors.toSet());

        // 한 번의 IN 쿼리로 사전 조회 (N+1 방지)
        Set<Long> followingIds = followRepository.findFollowingIdsByFollowerIdAndFollowingIds(userId, targetIds);
        Set<Long> requestedIds = followRequestRepository.findReceiverIdsBySenderIdAndReceiverIds(userId, targetIds);
        Set<Long> followerIds  = followRepository.findFollowerIdsByFollowingIdAndFollowerIds(userId, targetIds);

        return results.stream()
            .map(user -> new UserSearchResponseDto(
                user.getId(),
                user.getCustomId(),
                user.getNickname(),
                user.getEmail(),
                user.getProfileImageUrl(),
                resolveFollowStatusFromSets(user.getId(), followingIds, requestedIds), // Set 기반 판단
                user.getIsPublic(),
                followerIds.contains(user.getId())  // 나를 팔로우하는지 여부
            ))
            .toList();
    }

    // FollowStatus 판단 (DB 쿼리 없이 Set으로 처리)
    private FollowStatus resolveFollowStatusFromSets(Long targetId, Set<Long> followingIds, Set<Long> requestedIds) {
        if (followingIds.contains(targetId)) return FollowStatus.FOLLOWING;
        if (requestedIds.contains(targetId)) return FollowStatus.REQUESTED;
        return FollowStatus.NONE;
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
