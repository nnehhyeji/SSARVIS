package com.ssafy.ssarvis.common.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class QueryExecutionPlanService {

    private final JdbcTemplate jdbcTemplate;

    public String getExecutionPlan(String sql) {
        try {
            // MySQL 기준 EXPLAIN
            List<Map<String, Object>> result = jdbcTemplate.queryForList("EXPLAIN " + sql);
            return formatPlan(result);
        } catch (Exception e) {
            return "EXPLAIN 실패: " + e.getMessage();
        }
    }

    private String formatPlan(List<Map<String, Object>> rows) {
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> row : rows) {
            sb.append(row.toString()).append("\n");
        }
        return sb.toString();
    }
}
