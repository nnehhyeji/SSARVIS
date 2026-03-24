package com.ssafy.ssarvis.common.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StretchingScheduler {

    private final MattermostService mattermostService;

    // 오전 10:20
    @Scheduled(cron = "0 20 10 * * *")
    public void sendMorningStretch() {
        mattermostService.sendStretchMessage();
    }

    // 오후 2시
    @Scheduled(cron = "0 0 14 * * *")
    public void sendAfternoonStretch() {
        mattermostService.sendStretchMessage();
    }

    // 오후 4시
    @Scheduled(cron = "0 0 16 * * *")
    public void sendEveningStretch() {
        mattermostService.sendStretchMessage();
    }
}