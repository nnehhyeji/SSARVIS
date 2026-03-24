package com.ssafy.ssarvis.chat.repository;

import com.ssafy.ssarvis.chat.document.ChatMessageDocument;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ChatMessageRepository extends MongoRepository<ChatMessageDocument, String> {

    List<ChatMessageDocument> findBySessionId(String sessionId, Pageable pageable);
    List<ChatMessageDocument> findBySessionIdOrderByIdDesc(String sessionId, Pageable pageable);
    List<ChatMessageDocument> findBySessionIdAndIdLessThanOrderByIdDesc(String sessionId, String lastOffsetId, Pageable pageable);



}
