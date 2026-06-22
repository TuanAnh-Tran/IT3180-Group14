package com.cnpm.apartment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * DTO nhận yêu cầu tạo mới một đợt thu phí.
 */
@Data
public class PeriodSaveDTO {

    @NotBlank(message = "Tên đợt thu không được để trống")
    private String name;

    @NotEmpty(message = "Danh sách khoản phí áp dụng không được để trống")
    private List<String> feeIds;
}
