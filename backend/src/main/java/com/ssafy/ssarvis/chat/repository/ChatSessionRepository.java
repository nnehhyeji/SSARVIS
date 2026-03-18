package com.ssafy.ssarvis.chat.repository;

import com.ssafy.ssarvis.chat.document.ChatSessionDocument;
import com.ssafy.ssarvis.chat.domain.ChatMode;
import com.ssafy.ssarvis.chat.domain.ChatSessionStatus;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.w3c.dom.stylesheets.LinkStyle;

public interface ChatSessionRepository extends MongoRepository<ChatSessionDocument, String> {

    Optional<ChatSessionDocument> findByUserIdAndChatModeAndMemoryPolicyAndStatus(
        Long userId,
        ChatMode chatMode,
        MemoryPolicy memoryPolicy,
        ChatSessionStatus chatSessionStatus
    );


    List<ChatSessionDocument> findByUserIdOrderByLastMessageAtDesc(Long userId);

    List<ChatSessionDocument> findByUserIdAndChatModeOrderByLastMessageAtDesc(
        Long userId,
        ChatMode chatMode
    );
}
