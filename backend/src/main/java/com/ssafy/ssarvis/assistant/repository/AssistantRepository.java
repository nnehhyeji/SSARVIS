package com.ssafy.ssarvis.assistant.repository;

import com.ssafy.ssarvis.assistant.entity.Assistant;
import com.ssafy.ssarvis.assistant.entity.AssistantType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssistantRepository extends JpaRepository<Assistant, Long> {
    Optional<Long> findAssistantIdByUserIdAndAssistantType(Long userId, AssistantType assistantType);

    @Query("SELECT a.id as assistantId, v.modelId as modelId " +
        "FROM Assistant a " +
        "JOIN a.voice v " +
        "WHERE a.user.id = :userId AND a.assistantType = :assistantType")
    Optional<AssistantVoiceProjection> getAssistantIdAndModelIdByUserIdAndAssistantType(
        @Param("userId") Long userId,
        @Param("assistantType") AssistantType assistantType
    );

    Optional<Assistant> findByUserIdAndAssistantType(Long userId, AssistantType assistantType);


}
