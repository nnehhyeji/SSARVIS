package com.ssafy.ssarvis.common.dto;

import lombok.Builder;

@Builder
public record SlowQueryInfo(
    String timestamp,
    String domain,          // API 도메인 (order, user 등)
    String requestUri,
    String sql,
    long executionTimeMs,
    String executionPlan,   // EXPLAIN 결과
    String parameters
) {
}
