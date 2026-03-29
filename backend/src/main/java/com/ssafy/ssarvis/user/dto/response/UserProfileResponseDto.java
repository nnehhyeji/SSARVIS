package com.ssafy.ssarvis.user.dto.response;

import com.ssafy.ssarvis.user.entity.User;
import lombok.Builder;

@Builder
public record UserProfileResponseDto(
    Long userId,
    String nickname,
    String customId,
    String profileImageUrl,
    String description,
    Long viewCount,
    Boolean isPublic
) {
    public static UserProfileResponseDto from(User user) {
        return UserProfileResponseDto.builder()
            .userId(user.getId())
            .nickname(user.getNickname())
            .customId(user.getCustomId())
            .profileImageUrl(user.getProfileImageUrl())
            .viewCount(user.getViewCount())
            .description(user.getDescription())
            .isPublic(user.getIsPublic())
            .build();
    }
}
