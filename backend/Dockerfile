# syntax=docker/dockerfile:1
########################
# 1) Build stage
########################
# Gradle 8.5 이상이어야 Java 21을 완벽히 지원합니다. (9.x는 최신 버전)
FROM gradle:8.14.4-jdk21-alpine AS builder
WORKDIR /app

# (보완) 의존성 캐시를 위해 설정 파일들을 모두 복사
# 멀티 모듈 프로젝트라면 각 모듈의 build.gradle도 포함해야 합니다.
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle

# (보완) 의존성 다운로드 (소스 코드 복사 전 실행하여 레이어 캐싱 최적화)
RUN chmod +x ./gradlew
RUN ./gradlew --no-daemon dependencies -x test

# 이제 소스 복사 및 빌드
COPY src ./src
# bootJar는 보통 실행 가능한 jar 하나만 생성하므로 안전합니다.
RUN ./gradlew --no-daemon clean bootJar -x test

########################
# 2) Runtime stage
########################
# (수정) Java 21 JRE 사용
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# 보안: non-root 유저 설정
RUN addgroup -S spring && adduser -S spring -G spring

# [INFRA] 보완: Alpine 패키지 업데이트 및 보안 패치 적용
RUN apk update && apk upgrade --no-cache

USER spring

# (보완) 빌드 단계에서 생성된 특정 jar만 복사 (plain.jar 제외 방지)
COPY --from=builder /app/build/libs/*-SNAPSHOT.jar app.jar

# 서비스에 맞게 포트 수정 (기본 8080)
EXPOSE 8080

# (보완) 컨테이너 메모리 제한에 최적화된 JVM 옵션 추가
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]