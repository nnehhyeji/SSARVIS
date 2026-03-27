package com.ssafy.ssarvis.user.repository;

import com.ssafy.ssarvis.user.entity.SocialUser;
import com.ssafy.ssarvis.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SocialUserRepository extends JpaRepository<SocialUser, String> {

    boolean existsByUser(User user);
}
