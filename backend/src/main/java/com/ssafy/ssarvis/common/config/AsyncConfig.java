package com.ssafy.ssarvis.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "slackTaskExecutor")
    public Executor slackTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("slack-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy()); // 큐 가득 차면 그냥 버림 (서비스 영향 없도록)
        executor.initialize();
        return executor;
    }
}