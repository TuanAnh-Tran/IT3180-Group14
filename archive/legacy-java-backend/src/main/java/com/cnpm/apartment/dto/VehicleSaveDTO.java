package com.cnpm.apartment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class VehicleSaveDTO {

    private String id; // Trống nếu thêm mới, có giá trị nếu cập nhật

    @NotBlank(message = "Biển số xe không được để trống")
    private String plateNumber;

    @NotBlank(message = "Loại xe không được để trống")
    private String type; // e.g. MOTORCYCLE, CAR

    @NotBlank(message = "Tên chủ xe không được để trống")
    private String ownerName;

    @NotNull(message = "Ngày đăng ký không được để trống")
    private LocalDate registrationDate;

    @NotBlank(message = "Mã hộ khẩu không được để trống")
    private String householdId;
}
