package com.cnpm.apartment.dto;

import com.cnpm.apartment.model.enums.CalcMethod;
import com.cnpm.apartment.model.enums.FeeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO trả về thông tin khoản phí (Fee).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeeDTO {
    private String id;
    private String name;
    private FeeType type;
    private CalcMethod calcMethod;
    private BigDecimal price;
}
