package com.ssafy.ssarvis.follow.repository;

import com.ssafy.ssarvis.follow.entity.FollowRequest;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FollowRequestRepository extends JpaRepository<FollowRequest, Long> {

    boolean existsBySenderIdAndReceiverId(Long senderId, Long receiverId);

    Optional<FollowRequest> findByIdAndReceiverId(Long id, Long receiverId);

    List<FollowRequest> findAllByReceiverId(Long receiverId);

    @Query("SELECT fr.receiver.id FROM FollowRequest fr WHERE fr.sender.id = :userId AND fr.receiver.id IN :targetIds")
    Set<Long> findReceiverIdsBySenderIdAndReceiverIds(@Param("userId") Long userId, @Param("targetIds") Set<Long> targetIds);
}

