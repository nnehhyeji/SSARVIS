package com.ssafy.ssarvis.follow.dto.response;

import com.ssafy.ssarvis.assistant.entity.Assistant;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FollowAiResponseDto {

    private Long assistantId;
    private String name;
    private String modelId;
    private Boolean isAccessible; // 접근 가능 여부

    public static FollowAiResponseDto of(Assistant assistant, boolean isAccessible) {
        return FollowAiResponseDto.builder()
            .assistantId(assistant.getId())
            .name(assistant.getName())
            .modelId(assistant.getVoice().getModelId())
            .isAccessible(isAccessible)
            .build();
    }
}
