package com.ssafy.ssarvis.common.service;

import com.opencsv.CSVWriter;
import com.ssafy.ssarvis.common.dto.SlowQueryInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Service
@RequiredArgsConstructor
public class SlowQueryCsvService {

    @Value("${app.slow-query.csv-output-dir:./logs/slow-queries}")
    private String outputDir;

    // 도메인별 개별 Lock (서로 다른 도메인은 병렬 저장 가능)
    private final ConcurrentHashMap<String, ReentrantLock> domainLocks =
        new ConcurrentHashMap<>();

    public void save(SlowQueryInfo info) {
        ReentrantLock lock = domainLocks.computeIfAbsent(
            info.domain(), k -> new ReentrantLock()
        );

        lock.lock();
        try {
            writeToFile(info);
        } finally {
            lock.unlock();
        }
    }

    private void writeToFile(SlowQueryInfo info) {
        try {
            String date = LocalDate.now().toString();

            // logs/slow-queries/{domain}/{date}.csv
            Path dir = Paths.get(outputDir, info.domain());
            Files.createDirectories(dir);
            Path csvFile = dir.resolve(date + ".csv");

            boolean isNewFile = !Files.exists(csvFile);

            try (CSVWriter writer = new CSVWriter(new FileWriter(csvFile.toFile(), true))) {
                if (isNewFile) {
                    writer.writeNext(new String[]{
                        "timestamp", "domain", "request_uri",
                        "execution_time_ms", "sql", "execution_plan", "parameters"
                    });
                }
                writer.writeNext(new String[]{
                    info.timestamp(),
                    info.domain(),
                    info.requestUri(),
                    String.valueOf(info.executionTimeMs()),
                    info.sql().replace("\n", " "),
                    info.executionPlan().replace("\n", " | "),
                    info.parameters()
                });
            }
        } catch (IOException e) {
            System.err.println("[CSV] 저장 실패 - domain: "
                + info.domain() + " / " + e.getMessage());
        }
    }
}