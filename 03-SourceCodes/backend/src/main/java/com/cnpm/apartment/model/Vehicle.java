package com.cnpm.apartment.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Thực thể quản lý thông tin xe cộ chi tiết của từng hộ gia đình.
 */
@Entity
@Table(name = "vehicle")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "plate_number", nullable = false, unique = true, length = 50)
    private String plateNumber;

    @Column(name = "type", nullable = false, length = 50)
    private String type; // e.g. MOTORCYCLE, CAR

    @Column(name = "owner_name", nullable = false)
    private String ownerName;

    @Column(name = "registration_date", nullable = false)
    private LocalDate registrationDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;
}
