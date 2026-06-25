package com.cnpm.apartment.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request cập nhật chỉ số điện nước.
 */
@Data
public class UtilityRecordUpdateDTO {

    @NotBlank(message = "householdId không được để trống")
    private String householdId;

    @NotBlank(message = "periodId không được để trống")
    private String periodId;

    @NotBlank(message = "feeId không được để trống")
    private String feeId;

    @NotNull(message = "oldIndex không được để trống")
    @Min(value = 0, message = "Chỉ số cũ phải lớn hơn hoặc bằng 0")
    private Integer oldIndex;

    @NotNull(message = "newIndex không được để trống")
    @Min(value = 0, message = "Chỉ số mới phải lớn hơn hoặc bằng 0")
    private Integer newIndex;
}
