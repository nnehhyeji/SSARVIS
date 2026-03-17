package com.ssafy.ssarvis.follow.service;

import com.ssafy.ssarvis.follow.dto.request.FollowAcceptDto;
import com.ssafy.ssarvis.follow.dto.request.FollowRejectDto;
import com.ssafy.ssarvis.follow.dto.request.FollowRequestDto;

public interface FollowService {

    void requestFollow(Long senderId, FollowRequestDto followRequestDto);

    void acceptFollow(Long receiverId, FollowAcceptDto followAcceptDto);

    void rejectFollow(Long receiverId, FollowRejectDto followRejectDto);

}
