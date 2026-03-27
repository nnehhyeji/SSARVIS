package com.ssafy.ssarvis.user.dto.request;

import jakarta.validation.constraints.NotNull;

public record UserProfileVisibilityUpdateRequestDto(
    @NotNull Boolean isPublic
) {
}
