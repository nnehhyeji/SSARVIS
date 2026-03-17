package com.ssafy.ssarvis.user.dto.response;

import com.ssafy.ssarvis.user.entity.Costume;
import com.ssafy.ssarvis.user.entity.User;

public record UserResponseDto(
    Long id,
    String email,
    String nickname,
    String description,
    Boolean isVoiceLockActive,
    Costume costume,
    Long viewCount
){
    public static UserResponseDto from(User user) {
        return new UserResponseDto(
            user.getId(),
            user.getEmail(),
            user.getNickname(),
            user.getDescription(),
            user.getIsVoiceLockActive(),
            user.getCostume(),
            user.getViewCount()
        );
    }
}
