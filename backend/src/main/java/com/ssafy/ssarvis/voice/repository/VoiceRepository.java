package com.ssafy.ssarvis.voice.repository;

import com.ssafy.ssarvis.voice.entity.Voice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VoiceRepository extends JpaRepository<Voice, Long> {

    Optional<Voice> findByUserId(Long userId);

}
