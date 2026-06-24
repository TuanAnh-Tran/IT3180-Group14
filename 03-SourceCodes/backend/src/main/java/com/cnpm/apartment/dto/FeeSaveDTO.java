package com.cnpm.apartment.dto;

import com.cnpm.apartment.model.enums.CalcMethod;
import com.cnpm.apartment.model.enums.FeeType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO nhận yêu cầu tạo mới hoặc cập nhật khoản phí.
 */
@Data
public class FeeSaveDTO {

    private String id; // Trống nếu thêm mới, có giá trị nếu cập nhật

    @NotBlank(message = "Tên khoản phí không được để trống")
    private String name;

    @NotNull(message = "Loại khoản phí không được để trống")
    private FeeType type;

    @NotNull(message = "Phương thức tính không được để trống")
    private CalcMethod calcMethod;

    @NotNull(message = "Đơn giá không được để trống")
    @DecimalMin(value = "0.0", message = "Đơn giá phải lớn hơn hoặc bằng 0")
    private BigDecimal price;
}
