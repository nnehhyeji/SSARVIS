package com.ssafy.ssarvis.voice.repository;

import com.ssafy.ssarvis.voice.entity.Prompt;
import com.ssafy.ssarvis.voice.entity.PromptType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PromptRepository extends JpaRepository<Prompt, Long> {

    long countByUserIdAndPromptType(Long userId, PromptType promptType);

    Optional<Prompt> findTopByUserIdAndPromptTypeOrderByIdDesc(Long userId, PromptType promptType);

}
