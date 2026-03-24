package com.ssafy.ssarvis.common.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StretchingScheduler {

    private final MattermostService mattermostService;

    @Scheduled(cron = "0 20 10 * * *", zone = "Asia/Seoul")
    public void sendMorningStretch() {
        mattermostService.sendStretchMessage();
    }

    @Scheduled(cron = "0 0 14 * * *", zone = "Asia/Seoul")
    public void sendAfternoonStretch() {
        mattermostService.sendStretchMessage();
    }

    @Scheduled(cron = "0 0 16 * * *", zone = "Asia/Seoul")
    public void sendEveningStretch() {
        mattermostService.sendStretchMessage();
    }
}