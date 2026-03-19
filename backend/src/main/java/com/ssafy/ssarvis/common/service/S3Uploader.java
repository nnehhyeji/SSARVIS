package com.ssafy.ssarvis.common.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class S3Uploader {

    private final S3Client s3Client;

    @Value("${spring.app.s3.bucket}")
    private String bucket;

    @Value("${spring.cloud.aws.region.static}")
    private String region;

    public String upload(MultipartFile file, String directory) {
        String fileName = directory + "/" + UUID.randomUUID() + "_" + file.getOriginalFilename();

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(fileName)
                .contentType(file.getContentType())
                .contentLength(file.getSize())
                .build();

            s3Client.putObject(putObjectRequest,
                RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            String s3Url = "https://" + bucket + ".s3." + region + ".amazonaws.com/" + fileName;
            log.info("S3 업로드 성공 - url: {}", s3Url);
            return s3Url;

        } catch (IOException e) {
            log.error("S3 업로드 실패 - fileName: {}", fileName, e);
            throw new RuntimeException("S3 업로드 실패", e);
        }
    }

    public void delete(String s3Url) {
        String key = s3Url.substring(s3Url.indexOf(".amazonaws.com/") + ".amazonaws.com/".length());
        s3Client.deleteObject(DeleteObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build());
        log.info("S3 삭제 성공 - key: {}", key);
    }

}
