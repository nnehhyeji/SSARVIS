package com.ssafy.ssarvis.follow.controller;

import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.common.dto.BaseResponse;
import com.ssafy.ssarvis.follow.dto.request.FollowAcceptDto;
import com.ssafy.ssarvis.follow.dto.request.FollowListResponseDto;
import com.ssafy.ssarvis.follow.dto.request.FollowRejectDto;
import com.ssafy.ssarvis.follow.dto.request.FollowRequestDto;
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

}
