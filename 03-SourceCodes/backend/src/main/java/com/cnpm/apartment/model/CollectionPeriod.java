package com.cnpm.apartment.model;

import com.cnpm.apartment.model.enums.PeriodStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Đợt thu phí.
 * Bảng này do module Đợt thu phí (Phùng Việt Cường) quản lý,
 * module Thu phí chỉ đọc.
 */
@Entity
@Table(name = "collection_period")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionPeriod {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PeriodStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
