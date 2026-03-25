package com.ssafy.ssarvis.follow.controller;

import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.chat.dto.response.TopChatterResponseDto;
import com.ssafy.ssarvis.chat.service.ChatSessionService;
import com.ssafy.ssarvis.common.dto.BaseResponse;
import com.ssafy.ssarvis.follow.dto.request.FollowAcceptDto;
import com.ssafy.ssarvis.follow.dto.request.FollowListResponseDto;
import com.ssafy.ssarvis.follow.dto.request.FollowRejectDto;
import com.ssafy.ssarvis.follow.dto.request.FollowRequestDto;
import com.ssafy.ssarvis.follow.dto.response.FollowAiResponseDto;
import com.ssafy.ssarvis.follow.dto.response.FollowRequestListResponseDto;
import com.ssafy.ssarvis.follow.dto.response.FollowerListResponseDto;
import com.ssafy.ssarvis.follow.dto.response.UserSearchResponseDto;
import com.ssafy.ssarvis.follow.service.FollowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/follows")
public class FollowController {

    private final FollowService followService;
    private final ChatSessionService chatSessionService;

    @PostMapping("/request")
    public ResponseEntity<BaseResponse<Void>> requestFollow(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestBody @Valid FollowRequestDto followRequestDto
    ) {
        Long userId = customUserDetails.getUserId();
        followService.requestFollow(userId, followRequestDto);
        return ResponseEntity.ok(BaseResponse.success("친구 신청 성공"));
    }

    @PostMapping("/accept")
    public ResponseEntity<BaseResponse<Void>> acceptFollow(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestBody @Valid FollowAcceptDto followAcceptDto
    ) {
        Long userId = customUserDetails.getUserId();
        followService.acceptFollow(userId, followAcceptDto);
        return ResponseEntity.ok(BaseResponse.success("친구 수락 성공"));
    }

    @PostMapping("/reject")
    public ResponseEntity<BaseResponse<Void>> rejectFollow(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestBody @Valid FollowRejectDto followRejectDto
    ) {
        Long userId = customUserDetails.getUserId();
        followService.rejectFollow(userId, followRejectDto);
        return ResponseEntity.ok(BaseResponse.success("친구 거절 성공"));
    }

    @DeleteMapping("/{followId}")
    public ResponseEntity<BaseResponse<Void>> deleteFollow(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @PathVariable Long followId
    ) {
        Long userId = customUserDetails.getUserId();
        followService.deleteFollow(userId, followId);
        return ResponseEntity.ok(BaseResponse.success("친구 삭제 성공"));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<FollowListResponseDto>>> getFollowList(
        @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        Long userId = customUserDetails.getUserId();
        List<FollowListResponseDto> followList = followService.getFollowList(userId);
        return ResponseEntity.ok(BaseResponse.success("친구 리스트 조회 성공", followList));
    }

    @GetMapping("/requests")
    public ResponseEntity<BaseResponse<List<FollowRequestListResponseDto>>> getFollowRequestList(
        @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        Long userId = customUserDetails.getUserId();
        List<FollowRequestListResponseDto> result = followService.getFollowRequestList(userId);
        return ResponseEntity.ok(BaseResponse.success("팔로우 요청 리스트 조회 성공", result));
    }

    @GetMapping("/search")
    public ResponseEntity<BaseResponse<List<UserSearchResponseDto>>> searchUser(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestParam(required = false) String nickname,
        @RequestParam(required = false) String email
    ) {
        Long userId = customUserDetails.getUserId();
        List<UserSearchResponseDto> result = followService.searchUser(userId, nickname, email);
        return ResponseEntity.ok(BaseResponse.success("유저 검색 성공", result));
    }

    @GetMapping("/ai/{followId}")
    public ResponseEntity<BaseResponse<FollowAiResponseDto>> searchUser(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @PathVariable("followId") Long followId
    ) {

        Long loginUserId = (customUserDetails != null)
            ? customUserDetails.getUserId()
            : null;

        FollowAiResponseDto response = followService.getFollowDailyAi(loginUserId, followId);

        return ResponseEntity.ok(
            BaseResponse.success("친구 AI 조회 성공", response)
        );
    }

    @GetMapping("/top-chatters")
    public ResponseEntity<BaseResponse<List<TopChatterResponseDto>>> getTopChattingFriends(
        @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        Long userId = customUserDetails.getUserId();
        List<TopChatterResponseDto> result = chatSessionService.getTopChattingFriends(userId);
        return ResponseEntity.ok(BaseResponse.success("대화 많은 친구 순위 조회 성공", result));
    }

    @GetMapping("/followers")
    public ResponseEntity<BaseResponse<List<FollowerListResponseDto>>> getFollowerList(
        @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        Long userId = customUserDetails.getUserId();
        List<FollowerListResponseDto> followerList = followService.getFollowerList(userId);
        return ResponseEntity.ok(BaseResponse.success("팔로워 리스트 조회 성공", followerList));
    }

}
