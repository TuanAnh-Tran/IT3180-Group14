package com.cnpm.apartment.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Hộ gia đình trong chung cư.
 * Bảng này do module Hộ khẩu (Khôi) quản lý,
 * module Thu phí chỉ đọc thông tin.
 */
@Entity
@Table(name = "household")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Household {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "owner_name", nullable = false)
    private String ownerName;

    @Column(name = "members_count")
    private int membersCount;

    @Column(name = "area")
    private double area;

    @Column(name = "motorcycle_count")
    private int motorcycleCount;

    @Column(name = "car_count")
    private int carCount;
}
