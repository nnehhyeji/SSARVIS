package com.ssafy.ssarvis.chat.repository;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.chat.document.ChatSessionDocument;
import com.ssafy.ssarvis.chat.domain.ChatSessionType;
import java.util.List;
import org.springframework.data.domain.Pageable;


public interface ChatSessionCustomRepository {

    List<ChatSessionDocument> findDynamicSessionsByType(
        Long reqUserId, String tab, AssistantType chatMode,
        ChatSessionType chatSessionType, Pageable pageable);

}
