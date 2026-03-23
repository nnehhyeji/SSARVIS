package com.ssafy.ssarvis.follow.dto.response;

import com.ssafy.ssarvis.assistant.entity.Assistant;
import com.ssafy.ssarvis.follow.entity.FollowAccessType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FollowAiResponseDto {

    private Long assistantId;
    private String name;
    private String modelId;
    private FollowAccessType accessType;

    public static FollowAiResponseDto of(Assistant assistant, FollowAccessType accessType) {
        return FollowAiResponseDto.builder()
            .assistantId(assistant.getId())
            .name(assistant.getName())
            .modelId(assistant.getVoice().getModelId())
            .accessType(accessType)
            .build();
    }
}
