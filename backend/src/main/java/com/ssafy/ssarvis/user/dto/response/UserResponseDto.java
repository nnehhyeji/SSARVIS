package com.ssafy.ssarvis.user.dto.response;

import com.ssafy.ssarvis.user.entity.Costume;
import com.ssafy.ssarvis.user.entity.User;

public record UserResponseDto(
    Long id,
    String email,
    String nickname,
    String description,
    Boolean isVoiceLockActive,
    Boolean isAcceptPrompt,
    Costume costume,
    Long viewCount,
    Long voiceLockTimeout
){
    public static UserResponseDto from(User user) {
        return new UserResponseDto(
            user.getId(),
            user.getEmail(),
            user.getNickname(),
            user.getDescription(),
            user.getIsVoiceLockActive(),
            user.getIsAcceptPrompt(),
            user.getCostume(),
            user.getViewCount(),
            user.getVoiceLockTimeout()
        );
    }
}
