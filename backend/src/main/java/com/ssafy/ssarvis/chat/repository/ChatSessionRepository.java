package com.ssafy.ssarvis.chat.repository;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.chat.document.ChatSessionDocument;
import com.ssafy.ssarvis.chat.domain.ChatSessionStatus;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface ChatSessionRepository extends MongoRepository<ChatSessionDocument, String> {

    Optional<ChatSessionDocument> findByUserIdAndAssistantTypeAndMemoryPolicyAndChatSessionStatus(
        Long userId,
        AssistantType assistantType,
        MemoryPolicy memoryPolicy,
        ChatSessionStatus chatSessionStatus
    );


    List<ChatSessionDocument> findByUserIdOrderByLastMessageAtDesc(Long userId);

    List<ChatSessionDocument> findByUserIdAndAssistantTypeOrderByLastMessageAtDesc(
        Long userId,
        AssistantType assistantType
    );

    List<ChatSessionDocument> findByTargetUserIdAndUserIdIn(Long targetUserId, List<Long> friendUserIds);

}
