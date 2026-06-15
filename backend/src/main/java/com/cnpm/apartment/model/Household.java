package com.cnpm.apartment.model;

import com.cnpm.apartment.model.enums.HouseholdStatus;
import jakarta.persistence.*;
import lombok.*;

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

    @Column(name = "apartment_no", length = 50)
    private String apartmentNo;

    @Column(name = "floor")
    private Integer floor;

    @Column(name = "owner_name", nullable = false)
    private String ownerName;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "members_count")
    private int membersCount;

    @Column(name = "area")
    private double area;

    @Column(name = "motorcycle_count")
    private int motorcycleCount;

    @Column(name = "car_count")
    private int carCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private HouseholdStatus status;

    @Column(name = "note", length = 1000)
    private String note;

    @PrePersist
    public void prePersist() {
        if (this.status == null) {
            this.status = HouseholdStatus.OCCUPIED;
        }
        if (this.apartmentNo == null || this.apartmentNo.isBlank()) {
            this.apartmentNo = this.id;
        }
    }
}
