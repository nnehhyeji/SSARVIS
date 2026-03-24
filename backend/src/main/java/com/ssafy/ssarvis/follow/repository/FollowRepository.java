package com.ssafy.ssarvis.follow.repository;

import com.ssafy.ssarvis.follow.entity.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    // 상대방 레코드 삭제용 (A→B 삭제 시 B→A도 함께 삭제)
    @Query("SELECT f FROM Follow f WHERE (f.follower.id = :userA AND f.following.id = :userB) OR (f.follower.id = :userB AND f.following.id = :userA)")
    List<Follow> findBothFollows(@Param("userA") Long userA, @Param("userB") Long userB);

    List<Follow> findAllByFollowerId(Long followerId);

    List<Follow> findByFollowingId(Long followingId);


}
