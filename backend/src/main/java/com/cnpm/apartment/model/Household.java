package com.cnpm.apartment.model;

import com.cnpm.apartment.model.enums.HouseholdStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "head_resident_id")
    private Resident headResident;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "house_no", length = 100)
    private String houseNo;

    @Column(name = "street", length = 255)
    private String street;

    @Column(name = "ward", length = 255)
    private String ward;

    @Column(name = "district", length = 255)
    private String district;

    @Column(name = "registration_date")
    private LocalDate registrationDate;

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

    @Column(name = "previous_owner_name")
    private String previousOwnerName;

    @Column(name = "ownership_transferred_at")
    private LocalDateTime ownershipTransferredAt;

    @Column(name = "ownership_note", length = 1000)
    private String ownershipNote;

    @Builder.Default
    @Column(name = "archived", nullable = false)
    private boolean archived = false;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

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
