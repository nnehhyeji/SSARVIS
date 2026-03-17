package com.ssafy.ssarvis.follow.service;

import com.ssafy.ssarvis.follow.dto.request.FollowRequestDto;

public interface FollowService {

    void requestFollow(Long senderId, FollowRequestDto followRequestDto);

}
