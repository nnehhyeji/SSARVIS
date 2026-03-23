package com.ssafy.ssarvis.user.repository;

import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.user.entity.Prompt;
import com.ssafy.ssarvis.user.entity.PromptType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PromptRepository extends JpaRepository<Prompt, Long> {

    Optional<Prompt> findTopByUserAndPromptTypeOrderByIdDesc(User user, PromptType promptType);

    Optional<Prompt> findTopByUserIdAndPromptTypeOrderByIdDesc(Long userId, PromptType promptType);

}
