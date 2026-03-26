package com.ssafy.ssarvis.common.service;

import com.ssafy.ssarvis.common.dto.SlowQueryInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SlackNotificationService {

    @Value("${spring.app.slack.webhook-url:}")
    private String webhookUrl;

    @Value("${spring.app.slack.enabled:true}")
    private boolean enabled;

    private final RestTemplate restTemplate;

    public SlackNotificationService() {
        this.restTemplate = new RestTemplate();
    }

    @Async("slackTaskExecutor")
    public void sendAsync(SlowQueryInfo info) {
        if (!enabled || webhookUrl == null || webhookUrl.isBlank()) return;
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("text", buildHeader(info));
            body.put("blocks", buildBlocks(info));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            restTemplate.postForEntity(webhookUrl, entity, String.class);
        } catch (Exception e) {
            System.err.println("[Slack] 전송 실패: " + e.getMessage());
        }
    }

    private String buildHeader(SlowQueryInfo info) {
        return String.format("🐢 Slow Query | %s | %dms",
            info.domain(), info.executionTimeMs());
    }

    private List<Map<String, Object>> buildBlocks(SlowQueryInfo info) {
        List<Map<String, Object>> blocks = new ArrayList<>();
        blocks.add(headerBlock("🐢 Slow Query 감지"));
        blocks.add(sectionBlock(String.format(
            "*도메인:* `%s`\n*API:* `%s`\n*실행시간:* `%dms`\n*시각:* `%s`",
            info.domain(), info.requestUri(),
            info.executionTimeMs(), info.timestamp()
        )));
        blocks.add(dividerBlock());
        blocks.add(sectionBlock("*SQL*\n```" + truncate(info.sql(), 500) + "```"));
        blocks.add(sectionBlock("*실행계획*\n```" + truncate(info.executionPlan(), 800) + "```"));
        return blocks;
    }

    private Map<String, Object> headerBlock(String text) {
        Map<String, Object> block = new HashMap<>();
        block.put("type", "header");
        block.put("text", Map.of("type", "plain_text", "text", text));
        return block;
    }

    private Map<String, Object> sectionBlock(String markdown) {
        Map<String, Object> block = new HashMap<>();
        block.put("type", "section");
        block.put("text", Map.of("type", "mrkdwn", "text", markdown));
        return block;
    }

    private Map<String, Object> dividerBlock() {
        return Map.of("type", "divider");
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() > max ? text.substring(0, max) + "…" : text;
    }
}