package com.ssafy.ssarvis.voice.repository;

import com.ssafy.ssarvis.voice.entity.VoiceHistory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VoiceHistoryRepository extends MongoRepository<VoiceHistory, String> {

    List<VoiceHistory> findAllByUserIdOrderByCreatedAtDesc(Long userId);

}
