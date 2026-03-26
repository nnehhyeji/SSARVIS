package com.ssafy.ssarvis.chat.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class GuestChatRedisService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    // 웹소켓 Timeout이 10분이라면, 여유롭게 2배인 20분 설정
    private static final Duration HISTORY_TTL = Duration.ofMinutes(20);

    public void appendHistory(String wsSessionId, String role, String content) {
        String key = "guest:chat:history:" + wsSessionId;

        try {
            Map<String, String> message = new HashMap<>();
            message.put("role", role); // "USER" or "ASSISTANT"
            message.put("content", content);

            String jsonMessage = objectMapper.writeValueAsString(message);
            redisTemplate.opsForList().rightPush(key, jsonMessage);
            redisTemplate.expire(key, HISTORY_TTL); // TTL 갱신
        } catch (Exception e) {
            log.error("Guest History Append Failed. wsSessionId={}", wsSessionId, e);
        }
    }

    public List<Map<String, String>> getHistory(String wsSessionId) {
        String key = "guest:chat:history:" + wsSessionId;
        List<String> rawList = redisTemplate.opsForList().range(key, 0, -1);
        if (rawList == null) return Collections.emptyList();

        return rawList.stream().map(json -> {
            try {
                return objectMapper.readValue(json, new TypeReference<Map<String, String>>(){});
            } catch (Exception e) {
                return null;
            }
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }
}