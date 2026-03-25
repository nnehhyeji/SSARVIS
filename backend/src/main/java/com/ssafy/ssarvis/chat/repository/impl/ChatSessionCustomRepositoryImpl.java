package com.ssafy.ssarvis.chat.repository.impl;

import com.ssafy.ssarvis.assistant.entity.AssistantType;
import com.ssafy.ssarvis.chat.document.ChatSessionDocument;
import com.ssafy.ssarvis.chat.domain.ChatSessionStatus;
import com.ssafy.ssarvis.chat.domain.ChatSessionType;
import com.ssafy.ssarvis.chat.domain.MemoryPolicy;
import com.ssafy.ssarvis.chat.repository.ChatSessionCustomRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ChatSessionCustomRepositoryImpl implements ChatSessionCustomRepository {

    private final MongoTemplate mongoTemplate;

    @Override
    public List<ChatSessionDocument> findDynamicSessionsByType(Long reqUserId, String type,
        AssistantType assistantType, ChatSessionType chatSessionType, Pageable pageable) {

        Query query = new Query();
        Criteria criteria = new Criteria();

        if ("SECRETARY".equals(type)) {
            // 개인비서 타입 (내 AI와 대화)
            criteria.andOperator(
                Criteria.where("userId").is(reqUserId),
                Criteria.where("targetUserId").is(reqUserId),
                new Criteria().orOperator(
                    Criteria.where("memoryPolicy").is(MemoryPolicy.GENERAL),
                    new Criteria().andOperator(
                        Criteria.where("memoryPolicy").is(MemoryPolicy.SECRET),
                        Criteria.where("chatSessionStatus").is(ChatSessionStatus.ACTIVE)
                    )
                )
            );

            if (assistantType != null) {
                criteria.and("assistantType").is(assistantType);
            } else {
                criteria.and("assistantType").in(AssistantType.DAILY, AssistantType.STUDY, AssistantType.COUNSEL);
            }

        } else if ("PERSONA".equals(type)) {
            // 페르소나 타입 (내 페르소나와 대화)
            criteria.andOperator(
                Criteria.where("targetUserId").is(reqUserId),
                Criteria.where("assistantType").is(AssistantType.PERSONA)
            );

            if (chatSessionType != null) {
                criteria.and("chatSessionType").is(chatSessionType);
            }

        } else if ("GUESTBOOK".equals(type)) {
            // 방명록 (누군가 내 DAILY AI와 대화한 경우 - 수신)
            // 타겟이 나이고, 발화자는 타인이어야 함
            criteria.andOperator(
                Criteria.where("targetUserId").is(reqUserId),
                Criteria.where("userId").ne(reqUserId) // 타인 개입 방어
            );

            // AVATAR_AI(상대가 직접) 또는 AI_AI(상대의 AI가) 필터링
            if (chatSessionType != null) {
                criteria.and("chatSessionType").is(chatSessionType);
            }

        } else if ("VISIT".equals(type)) {
            // 내 방문 (내가 타인의 DAILY AI와 대화한 경우 - 발신, 신규 탭!)
            // 발화자가 나이고, 타겟은 타인이어야 함
            criteria.andOperator(
                Criteria.where("userId").is(reqUserId),
                Criteria.where("targetUserId").ne(reqUserId) // 타인 개입 방어
            );

            // AVATAR_AI(내가 직접) 또는 AI_AI(내 AI가 대신) 필터링
            if (chatSessionType != null) {
                criteria.and("chatSessionType").is(chatSessionType);
            }
        }

        query.addCriteria(criteria);
        query.with(pageable);

        return mongoTemplate.find(query, ChatSessionDocument.class);
    }
}