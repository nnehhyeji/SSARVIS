package com.ssafy.ssarvis.voice.repository;

import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.voice.entity.Evaluation;
import com.ssafy.ssarvis.voice.entity.PromptType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {

    long countByUserAndPromptType(User user, PromptType promptType);

    List<Evaluation> findTop5ByUserAndPromptTypeOrderByIdDesc(User user, PromptType promptType);
}