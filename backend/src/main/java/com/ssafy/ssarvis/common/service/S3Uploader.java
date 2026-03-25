package com.ssafy.ssarvis.common.service;

import java.io.File;
import java.io.FileInputStream;
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

    @Value("${spring.app.s3.cloudfront-domain}")
    private String cloudFrontDomain;

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

            // 2. S3 직접 주소 대신 CloudFront URL 반환
            String cloudFrontUrl = buildCloudFrontUrl(fileName);
            log.info("S3 업로드 성공 (CloudFront 적용) - url: {}", cloudFrontUrl);
            return cloudFrontUrl;

        } catch (IOException e) {
            log.error("S3 업로드 실패 - fileName: {}", fileName, e);
            throw new RuntimeException("S3 업로드 실패", e);
        }
    }

    // uploadFile 메서드도 동일하게 수정
    public String uploadFile(File file, String directory, String contentType) {
        String fileName = directory + "/" + UUID.randomUUID() + "_" + file.getName();

        try (FileInputStream fis = new FileInputStream(file)) {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(fileName)
                .contentType(contentType)
                .contentLength(file.length())
                .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(fis, file.length()));

            String cloudFrontUrl = buildCloudFrontUrl(fileName);
            log.info("S3 파일 업로드 성공 (CloudFront 적용) - url: {}", cloudFrontUrl);
            return cloudFrontUrl;

        } catch (IOException e) {
            log.error("S3 파일 업로드 실패 - fileName: {}", fileName, e);
            throw new RuntimeException("S3 파일 업로드 실패", e);
        }
    }

    // 3. 삭제 로직 수정: URL에서 도메인 부분을 제거하고 'Key'만 추출하도록 변경
    public void delete(String url) {
        if (url == null || url.isEmpty()) return;

        // CloudFront 주소든 S3 주소든 마지막 '/' 이후가 아닌, 도메인 이후의 경로를 가져와야 함
        String key = extractKey(url);

        s3Client.deleteObject(DeleteObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build());
        log.info("S3 객체 삭제 성공 - key: {}", key);
    }

    // 4. 헬퍼 메서드 추가
    private String buildCloudFrontUrl(String key) {
        return cloudFrontDomain + "/" + key;
    }

    private String extractKey(String url) {
        // CloudFront 도메인을 포함하고 있다면 해당 부분 제거
        if (url.contains(cloudFrontDomain)) {
            return url.replace(cloudFrontDomain + "/", "");
        }
        // 혹시 남아있을 구형 S3 URL 처리
        if (url.contains(".amazonaws.com/")) {
            return url.substring(url.indexOf(".amazonaws.com/") + ".amazonaws.com/".length());
        }
        return url;
    }
}