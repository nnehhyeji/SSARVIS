package com.ssafy.ssarvis.common.config.query;

import com.p6spy.engine.spy.appender.MessageFormattingStrategy;
import com.ssafy.ssarvis.common.dto.SlowQueryInfo;
import com.ssafy.ssarvis.common.service.QueryExecutionPlanService;
import com.ssafy.ssarvis.common.service.SlackNotificationService;
import com.ssafy.ssarvis.common.service.SlowQueryCsvService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.MDC;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Component
public class SlowQueryP6SpyLogger implements MessageFormattingStrategy {

    private static final DateTimeFormatter DTF =
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    // ── 정적 필드: P6Spy는 리플렉션으로 직접 인스턴스화하므로
    //    Spring 빈 주입이 불가 → ApplicationContext를 통해 late-binding
    private static ApplicationContext ctx;
    private static long thresholdMs = 50L;

    /** SpringApplicationContext에서 주입 (SlowQueryP6SpyConfig에서 호출) */
    public static void init(ApplicationContext applicationContext, long threshold) {
        ctx = applicationContext;
        thresholdMs = threshold;
    }

    // ── P6Spy MessageFormattingStrategy 구현 ──────────────────────────────
    @Override
    public String formatMessage(int connectionId, String now, long elapsed,
                                String category, String prepared, String sql,
                                String url) {
        // DDL / 빈 쿼리는 무시
        if (sql == null || sql.isBlank()) return "";

        // 슬로우 쿼리 기준 초과 & SELECT 계열만 EXPLAIN 대상
        if (elapsed >= thresholdMs) {
            handleSlowQuery(sql, prepared, elapsed);
        }

        // 일반 로그 출력 (필요 없으면 return "" 로 변경)
        return String.format("[%dms] %s", elapsed, sql.replaceAll("\\s+", " ").trim());
    }

    // ── 내부 처리 ─────────────────────────────────────────────────────────
    private void handleSlowQuery(String sql, String prepared, long elapsed) {
        if (ctx == null) {
            System.err.println("[SlowQueryLogger] Error: ApplicationContext(ctx) is NULL!");
            return;
        }
        try {
            String requestUri = resolveRequestUri();   // HTTP 요청 URI (MDC 우선)
            String domain = resolveDomain(requestUri); // URI 첫 세그먼트를 도메인으로 사용

            QueryExecutionPlanService planService =
                ctx.getBean(QueryExecutionPlanService.class);
            SlackNotificationService slackService =
                ctx.getBean(SlackNotificationService.class);
            SlowQueryCsvService csvService =
                ctx.getBean(SlowQueryCsvService.class);

            // SELECT 계열만 EXPLAIN 실행 (INSERT/UPDATE/DELETE는 스킵)
            String plan = sql.trim().toUpperCase().startsWith("SELECT")
                ? planService.getExecutionPlan(sql)
                : "EXPLAIN 미지원 쿼리 유형";

            SlowQueryInfo info = SlowQueryInfo.builder()
                .timestamp(LocalDateTime.now().format(DTF))
                .domain(domain)
                .requestUri(requestUri)
                .sql(sql)
                .executionTimeMs(elapsed)
                .executionPlan(plan)
                .parameters(prepared)   // 바인딩 파라미터 포함 원본 SQL
                .build();

            slackService.sendAsync(info);   // 비동기 Slack 전송
            csvService.save(info);          // 동기 CSV 저장

        } catch (Exception e) {
            System.err.println("[SlowQueryLogger] 처리 실패: " + e.getMessage());
        }
    }

    /**
     * HTTP 요청 URI 조회.
     * 우선순위: MDC("requestUri") → RequestContextHolder → "UNKNOWN"
     */
    private String resolveRequestUri() {
        // 1) MDC (RequestLoggingFilter에서 미리 심어둔 경우)
        String fromMdc = MDC.get("requestUri");
        if (fromMdc != null && !fromMdc.isBlank()) return fromMdc;

        // 2) RequestContextHolder (HTTP 요청 스레드에서 직접 접근)
        try {
            ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                String uri = req.getRequestURI();
                String query = req.getQueryString();
                return query != null ? uri + "?" + query : uri;
            }
        } catch (Exception ignored) { }

        return "UNKNOWN";
    }

    /**
     * "/api/orders/1" → "orders"
     * "/UNKNOWN"      → "unknown"
     */
    private String resolveDomain(String requestUri) {
        if (requestUri == null || requestUri.equals("UNKNOWN")) return "unknown";
        String[] parts = requestUri.split("/");
        // /api/{domain}/... 구조 가정 → parts[2]
        // /orders/...        구조 가정 → parts[1]
        for (String part : parts) {
            if (!part.isBlank() && !part.equalsIgnoreCase("api")) return part;
        }
        return "unknown";
    }
}