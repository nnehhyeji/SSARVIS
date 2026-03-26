package com.ssafy.ssarvis.user.repository;

import com.ssafy.ssarvis.user.entity.User;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByCustomId(String customId);

    @Query("SELECT u FROM User u WHERE (u.nickname LIKE %:keyword% OR u.customId LIKE %:keyword%) AND u.withdrawStatus = false")
    List<User> findByNicknameOrCustomIdContaining(@Param("keyword") String keyword);

}
