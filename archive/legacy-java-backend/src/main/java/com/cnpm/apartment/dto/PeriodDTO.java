package com.cnpm.apartment.dto;

import com.cnpm.apartment.model.enums.PeriodStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO trả về thông tin đợt thu phí (CollectionPeriod).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PeriodDTO {
    private String id;
    private String name;
    private PeriodStatus status;
    private LocalDateTime createdAt;
    private List<String> feeIds; // Danh sách mã các khoản phí được áp dụng trong đợt thu này
}
