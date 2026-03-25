package com.ssafy.ssarvis.user.event;

import lombok.AllArgsConstructor;

@AllArgsConstructor
public class UserProfileImageUpdateEvent {
    Long targetUserId;
    String newTargetUserProfileImageUrl;
}
