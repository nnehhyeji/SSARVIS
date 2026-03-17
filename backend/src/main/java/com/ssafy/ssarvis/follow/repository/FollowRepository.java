package com.ssafy.ssarvis.follow.repository;

import com.ssafy.ssarvis.follow.entity.Follow;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {

    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);

    @Query("SELECT f FROM Follow f WHERE f.id = :followId AND (f.follower.id = :userId OR f.following.id = :userId)")
    Optional<Follow> findByIdAndFollowerIdOrFollowingId(
        @Param("followId") Long followId,
        @Param("userId") Long userId
    );
    List<Follow> findAllByFollowerId(Long followerId);

}
