package com.ssafy.ssarvis.common.advice;

import com.ssafy.ssarvis.common.exception.ErrorCode;
import lombok.Getter;

@Getter
public class CustomException extends RuntimeException {

    protected ErrorCode errorCode;
    protected Object data;

    public CustomException(String message, ErrorCode errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    public CustomException(String message, ErrorCode errorCode, Object data) {
        super(message);
        this.errorCode = errorCode;
        this.data = data;
    }
}
