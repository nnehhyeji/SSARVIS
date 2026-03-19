package com.ssafy.ssarvis.follow.repository;

import com.ssafy.ssarvis.follow.entity.FollowRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FollowRequestRepository extends JpaRepository<FollowRequest, Long> {

    boolean existsBySenderIdAndReceiverId(Long senderId, Long receiverId);

    Optional<FollowRequest> findByIdAndReceiverId(Long id, Long receiverId);

    List<FollowRequest> findAllByReceiverId(Long receiverId);

}
