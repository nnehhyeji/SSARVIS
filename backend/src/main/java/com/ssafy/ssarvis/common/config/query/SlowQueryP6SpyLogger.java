package com.ssafy.ssarvis.common.config.query;

import com.p6spy.engine.spy.appender.MessageFormattingStrategy;
import com.ssafy.ssarvis.common.dto.SlowQueryInfo;
import com.ssafy.ssarvis.common.service.QueryExecutionPlanService;
import com.ssafy.ssarvis.common.service.SlackNotificationService;
import com.ssafy.ssarvis.common.service.SlowQueryCsvService;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class SlowQueryP6SpyLogger implements MessageFormattingStrategy {

    private static final long DUPLICATE_SUPPRESS_MS = 5 * 60 * 1000L;

    private static final Map<Integer, Long> RECENT_ALERT_CACHE =
        Collections.synchronizedMap(new LinkedHashMap<>() {
            @Override
            protected boolean removeEldestEntry(Map.Entry<Integer, Long> eldest) {
                return size() > 500;
            }
        });


    @Override
    public String formatMessage(int connectionId, String now, long elapsed,
                                String category, String prepared, String sql, String url) {

        if (!isTarget(elapsed, sql)) return "";

        try {
            int sqlHash = normalizeSql(sql).hashCode();
            if (isDuplicate(sqlHash)) return sql;
            markAlerted(sqlHash);

            String domain = Optional.ofNullable(QueryContextFilter.CURRENT_DOMAIN.get()).orElse("unknown");
            String uri = Optional.ofNullable(QueryContextFilter.CURRENT_URI.get()).orElse("N/A");

            String executionPlan = ApplicationContextHolder
                .getBean(QueryExecutionPlanService.class)
                .getExecutionPlan(sql);

            SlowQueryInfo info = SlowQueryInfo.builder()
                .timestamp(LocalDateTime.now().toString())
                .domain(domain)
                .requestUri(uri)
                .sql(sql)
                .executionTimeMs(elapsed)
                .executionPlan(executionPlan)
                .parameters(prepared)
                .build();

            ApplicationContextHolder.getBean(SlowQueryCsvService.class).save(info);
            ApplicationContextHolder.getBean(SlackNotificationService.class).sendAsync(info);

        } catch (IllegalStateException e) {
            // Spring 초기화 전 P6Spy가 먼저 실행되는 경우 (정상적으로 무시)
            System.err.println("[P6Spy] Spring 초기화 전 실행 - 스킵: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("[P6Spy] 처리 실패: " + e.getMessage());
        }

        return sql;
    }


    private boolean isTarget(long elapsed, String sql) {
        if (sql == null || sql.isBlank()) return false;
        if (!sql.trim().toUpperCase().startsWith("SELECT")) return false;

        long threshold = getThreshold();
        return elapsed >= threshold;
    }

    /**
     * 파라미터 값 제거 후 정규화 (중복 판단용)
     */
    private String normalizeSql(String sql) {
        return sql.replaceAll("'[^']*'", "?")   // 문자열 파라미터 제거
            .replaceAll("\\d+", "?")       // 숫자 파라미터 제거
            .replaceAll("\\s+", " ")        // 공백 정규화
            .trim().toLowerCase();
    }

    private boolean isDuplicate(int sqlHash) {
        Long lastAlerted = RECENT_ALERT_CACHE.get(sqlHash);
        if (lastAlerted == null) return false;
        return System.currentTimeMillis() - lastAlerted < DUPLICATE_SUPPRESS_MS;
    }

    private void markAlerted(int sqlHash) {
        RECENT_ALERT_CACHE.put(sqlHash, System.currentTimeMillis());
    }

    private long getThreshold() {
        try {
            return ApplicationContextHolder.getBean(Environment.class)
                .getProperty("app.slow-query.threshold-ms", Long.class, 1000L);
        } catch (Exception e) {
            return 1000L;
        }
    }
}
