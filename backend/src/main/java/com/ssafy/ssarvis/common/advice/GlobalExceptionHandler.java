package com.ssafy.ssarvis.common.advice;

import com.ssafy.ssarvis.common.dto.BaseResponse;
import com.ssafy.ssarvis.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<BaseResponse<?>> handleCustomException(CustomException e) {
        log.error("CustomException: code={}, message={}", e.getErrorCode(), e.getMessage());

        ErrorCode errorCode = e.getErrorCode();
        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(BaseResponse.fail(
                errorCode.name(),
                e.getMessage() != null ? e.getMessage() : errorCode.getMessage()
            ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<BaseResponse<?>> handleValidationException(MethodArgumentNotValidException e) {
        boolean isMissingParams = e.getBindingResult().getFieldErrors().stream()
            .anyMatch(error -> {
                String code = error.getCode();
                return "NotNull".equals(code) || "NotBlank".equals(code) || "NotEmpty".equals(code);
            });

        String errorMessage = e.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(FieldError::getDefaultMessage)
            .orElse("잘못된 요청입니다.");

        ErrorCode errorCode = isMissingParams ? ErrorCode.MISSING_PARAMETER : ErrorCode.INVALID_PARAMETER;

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(BaseResponse.fail(errorCode.name(), errorMessage));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<BaseResponse<?>> handleNoResourceFoundException(NoResourceFoundException e) {
        ErrorCode errorCode = ErrorCode.NOT_FOUND;
        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(BaseResponse.fail(errorCode.name(), errorCode.getMessage()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<BaseResponse<?>> handleMethodArgumentTypeMismatchException(
        MethodArgumentTypeMismatchException e) {
        ErrorCode errorCode = ErrorCode.BAD_REQUEST;
        return ResponseEntity.status(errorCode.getHttpStatus())
            .body(BaseResponse.fail(errorCode.name(), errorCode.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<BaseResponse<?>> handleJsonParseException(
        HttpMessageNotReadableException e) {
        log.error("JSON Parse Error: {}", e.getMessage());

        ErrorCode errorCode = ErrorCode.INVALID_FORMAT;

        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(BaseResponse.fail(errorCode.name(), errorCode.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<BaseResponse<?>> handleAllException(Exception e) {
        log.error("[UNEXPECTED ERROR]", e);

        ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(errorCode.getHttpStatus())
            .body(BaseResponse.fail(errorCode.name(), errorCode.getMessage()));
    }
}
