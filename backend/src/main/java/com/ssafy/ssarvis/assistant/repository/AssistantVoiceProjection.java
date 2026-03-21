package com.ssafy.ssarvis.assistant.repository;

import java.util.UUID;

public interface AssistantVoiceProjection{
    Long getAssistantId();
    UUID getModelUuid();
}
