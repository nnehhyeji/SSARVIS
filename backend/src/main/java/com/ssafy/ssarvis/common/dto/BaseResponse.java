package com.ssafy.ssarvis.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.Map;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PRIVATE)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@JsonInclude(Include.NON_NULL)
public class BaseResponse<T> {

    // 실패 시에만 전송되는 실패 정보(ErrorCode.name)
    private String code;
    private String message;
    private T data;

    /**
     * 성공 시 응답 200 OK, 201 Created
     * @param message FE <- BE 전달용 메세지
     * @param data 실제 데이터
     * @return BaseResponse: 공통 Response 타입
     * @param <T> Generic
     */
    public static <T> BaseResponse<T> success(String message, T data){
        return new BaseResponse<>(null, message, data);
    }

    // 204 NO Content 경우 사용
    // ResponseEntity.status(HttpStatus.NoContent)을 사용할 경우,
    // 프론트에 아무 내용이 나가지 않기 때문에 해당 메서드 사용
    public static <T> BaseResponse<T> success(String message) {
        return new BaseResponse<>(null, message, null);
    }

    /**
     * 실패 시 응답
     * @param code FE <- BE 전달용 에러 코드(ErrorCode.name)
     * @param message FE <- BE 전달용 메세지
     * @return data는 실패 시 null
     */
    public static BaseResponse<Object> fail(String code, String message) {
        return new BaseResponse<>(code, message, Map.of());
    }
}