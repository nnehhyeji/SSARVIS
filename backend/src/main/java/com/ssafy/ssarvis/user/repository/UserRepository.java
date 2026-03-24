package com.ssafy.ssarvis.user.repository;

import com.ssafy.ssarvis.user.entity.User;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByCustomId(String nickname);

    List<User> findByNicknameContaining(String nickname);

    List<User> findByEmailContaining(String email);

}
