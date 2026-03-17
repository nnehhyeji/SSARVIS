package com.ssafy.ssarvis.follow.controller;

import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.common.dto.BaseResponse;
import com.ssafy.ssarvis.follow.dto.request.FollowRequestDto;
import com.ssafy.ssarvis.follow.service.FollowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/follows")
public class FollowController {

    private final FollowService followService;

    @PostMapping
    public ResponseEntity<BaseResponse<Void>> requestFollow(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestBody @Valid FollowRequestDto followRequestDto
    ) {
        Long userId = customUserDetails.getUserId();
        followService.requestFollow(userId, followRequestDto);
        return ResponseEntity.ok(BaseResponse.success("친구 신청 성공"));
    }

}
