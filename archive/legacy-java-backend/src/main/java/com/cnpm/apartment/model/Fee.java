package com.cnpm.apartment.model;

import com.cnpm.apartment.model.enums.CalcMethod;
import com.cnpm.apartment.model.enums.FeeType;
import jakarta.persistence.*;
import lombok.*;

/**
 * Khoản phí (định nghĩa loại phí).
 * Bảng này do module Khoản thu (Phùng Việt Cường) quản lý,
 * module Thu phí chỉ đọc.
 */
@Entity
@Table(name = "fee")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Fee {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private FeeType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "calc_method", nullable = false)
    private CalcMethod calcMethod;

    @Column(name = "price", nullable = false, precision = 15, scale = 2)
    private java.math.BigDecimal price;
}
