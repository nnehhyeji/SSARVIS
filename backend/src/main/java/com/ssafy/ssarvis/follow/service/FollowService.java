package com.ssafy.ssarvis.follow.service;

import com.ssafy.ssarvis.follow.dto.request.FollowAcceptDto;
import com.ssafy.ssarvis.follow.dto.request.FollowListResponseDto;
import com.ssafy.ssarvis.follow.dto.request.FollowRejectDto;
import com.ssafy.ssarvis.follow.dto.request.FollowRequestDto;
import com.ssafy.ssarvis.follow.dto.response.FollowRequestListResponseDto;

import java.util.List;

public interface FollowService {

    void requestFollow(Long senderId, FollowRequestDto followRequestDto);

    void acceptFollow(Long receiverId, FollowAcceptDto followAcceptDto);

    void rejectFollow(Long receiverId, FollowRejectDto followRejectDto);

    void deleteFollow(Long followerId, Long followId);

    List<FollowListResponseDto> getFollowList(Long followerId);

    List<FollowRequestListResponseDto> getFollowRequestList(Long userId);

}
