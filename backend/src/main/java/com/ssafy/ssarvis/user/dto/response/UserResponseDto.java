package com.ssafy.ssarvis.user.dto.response;

import com.ssafy.ssarvis.user.entity.User;

public record UserResponseDto(
    Long id,
    String email,
    String nickname,
    String customId,
    String description,
    Boolean isVoiceLockActive,
    Boolean isAcceptPrompt,
    Boolean isProfilePublic,
    Long voiceLockTimeout,
    String userProfileImageUrl
){
    public static UserResponseDto from(User user) {
        return new UserResponseDto(
            user.getId(),
            user.getEmail(),
            user.getNickname(),
            user.getCustomId(),
            user.getDescription(),
            user.getIsVoiceLockActive(),
            user.getIsAcceptPrompt(),
            user.getIsPublic(),
            user.getVoiceLockTimeout(),
            user.getProfileImageUrl()
        );
    }
}
