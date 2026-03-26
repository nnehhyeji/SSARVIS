package com.ssafy.ssarvis.common.config.query;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class SlowQuery6spyConfig {

    private final ApplicationContext applicationContext;

    @Value("${spring.app.slow-query.threshold-ms:10}")
    private long thresholdMs;

    @PostConstruct
    public void init() {
        SlowQueryP6SpyLogger.init(applicationContext, thresholdMs);
    }
}