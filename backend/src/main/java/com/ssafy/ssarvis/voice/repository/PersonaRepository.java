package com.ssafy.ssarvis.voice.repository;

import com.ssafy.ssarvis.user.entity.User;
import com.ssafy.ssarvis.voice.entity.Persona;
import com.ssafy.ssarvis.voice.entity.PromptType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PersonaRepository extends JpaRepository<Persona, Long> {

    Optional<Persona> findTopByUserAndPromptTypeOrderByIdDesc(User user, PromptType promptType);

    Optional<Persona> findTopByUserIdAndPromptTypeOrderByIdDesc(Long userId, PromptType promptType);

}
