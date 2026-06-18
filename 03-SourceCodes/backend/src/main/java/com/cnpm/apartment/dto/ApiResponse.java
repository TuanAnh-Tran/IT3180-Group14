package com.cnpm.apartment.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Wrapper chuẩn cho tất cả API response.
 * Frontend luôn nhận về dạng: { success, message, data }
 */
@Data
@AllArgsConstructor
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;

    // Factory method thành công
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "Thành công", data);
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    // Factory method thất bại
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }
}
