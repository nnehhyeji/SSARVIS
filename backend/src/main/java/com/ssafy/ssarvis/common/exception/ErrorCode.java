package com.ssafy.ssarvis.common.exception;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor(access = AccessLevel.PROTECTED)
public enum ErrorCode {

    // ============================================================
    // * COMMON (기존 유지)
    // ============================================================
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    INVALID_PARAMETER(HttpStatus.BAD_REQUEST, "파라미터 값이 잘못되었습니다."),
    MISSING_PARAMETER(HttpStatus.BAD_REQUEST, "필수 파라미터가 누락되었습니다."),
    TYPE_MISMATCH(HttpStatus.BAD_REQUEST, "타입이 불일치합니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 리소스입니다."),
    DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "중복된 리소스입니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류입니다."),
    INVALID_FORMAT(HttpStatus.BAD_REQUEST, "입력 형식이 올바르지 않습니다."),

    // ============================================================
    // * AUTH (기존 유지)
    // ============================================================
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    LOGIN_FAILED(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 일치하지 않습니다."),
    ACCESS_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "액세스 토큰이 만료되었습니다."),
    ACCESS_TOKEN_NOT_FOUND(HttpStatus.UNAUTHORIZED, "액세스 토큰을 찾을 수 없습니다."),
    REFRESH_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "리프레시 토큰이 만료되었습니다."),
    REFRESH_TOKEN_NOT_FOUND(HttpStatus.UNAUTHORIZED, "로그아웃 된 사용자입니다."),
    EMPTY_TOKEN(HttpStatus.UNAUTHORIZED, "토큰이 비어있습니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    WRONG_TYPE_TOKEN(HttpStatus.UNAUTHORIZED, "잘못된 서명 또는 형식의 토큰입니다."),
    UNSUPPORTED_TOKEN(HttpStatus.UNAUTHORIZED, "지원하지 않는 토큰입니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    SOCIAL_LOGIN_FAILED(HttpStatus.UNAUTHORIZED, "소셜 로그인에 실패했습니다."),
    SOCIAL_UNLINK_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "소셜 연동 해제에 실패했습니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "리프레시 토큰이 일치하지 않습니다."),

    // ============================================================
    // 1. USER (사용자)
    // ============================================================
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 존재하는 이메일입니다."),
    NICKNAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 존재하는 닉네임입니다."),
    VOICE_PASSWORD_MISMATCH(HttpStatus.BAD_REQUEST, "음성 비밀번호가 일치하지 않습니다."),
    USER_WITHDRAW(HttpStatus.FORBIDDEN, "탈퇴한 유저입니다."),

    // ============================================================
    // 2. ASSISTANT (어시스턴트)
    // ============================================================
    ASSISTANT_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 어시스턴트를 찾을 수 없습니다."),
    INVALID_ASSISTANT_TYPE(HttpStatus.BAD_REQUEST, "유효하지 않은 어시스턴트 타입입니다."),

    // ============================================================
    // 3. BUSINESS CARD (명함)
    // ============================================================
    BUSINESS_CARD_NOT_FOUND(HttpStatus.NOT_FOUND, "명함 정보를 찾을 수 없습니다."),
    PRIVATE_CARD_ACCESS_DENIED(HttpStatus.FORBIDDEN, "비공개 명함에 접근할 권한이 없습니다."),

    // ============================================================
    // 4. VOICE (음성)
    // ============================================================
    VOICE_NOT_FOUND(HttpStatus.NOT_FOUND, "음성 모델 정보를 찾을 수 없습니다."),
    VOICE_NOT_OWNED(HttpStatus.FORBIDDEN, "해당 음성에 대한 소유권이 없습니다."),

    // ============================================================
    // 5. FOLLOW (팔로우 / 요청)
    // ============================================================
    FOLLOW_NOT_FOUND(HttpStatus.NOT_FOUND, "팔로우 관계를 찾을 수 없습니다."),
    FOLLOW_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "팔로우 요청을 찾을 수 없습니다."),
    CANNOT_FOLLOW_SELF(HttpStatus.BAD_REQUEST, "자기 자신은 팔로우할 수 없습니다."),
    ALREADY_FOLLOWING(HttpStatus.CONFLICT, "이미 팔로우 중인 사용자입니다."),
    ALREADY_REQUESTED_FOLLOW(HttpStatus.CONFLICT, "이미 팔로우 요청을 보냈습니다."),

    // ============================================================
    // 6. NOTIFICATION (알림)
    // ============================================================
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."),
    NOTIFICATION_TYPE_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 알림 타입입니다.");

    private final HttpStatus httpStatus;
    private final String message;
}
