package com.ssafy.ssarvis.user.repository;

import com.ssafy.ssarvis.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

}
