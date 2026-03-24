package com.ssafy.ssarvis.common.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class MattermostService {

    @Value("${spring.app.mattermost.webhook-url}")
    private String webhookUrl;

    @Value("${spring.app.mattermost.enabled}")
    private boolean enabled;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendStretchMessage() {
        if (!enabled) return;

        Map<String, String> body = new HashMap<>();
        body.put("text", "🧘‍♂️ 스트레칭 시간입니다! 잠깐 몸 풀어주세요 💪 가장 비싼 피자는?! '허리피자'");

        restTemplate.postForEntity(webhookUrl, body, String.class);
    }
}