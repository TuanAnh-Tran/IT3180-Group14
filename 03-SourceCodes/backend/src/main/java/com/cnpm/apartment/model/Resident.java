package com.cnpm.apartment.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

/**
 * Nhân khẩu / Cư dân trong chung cư.
 */
@Entity
@Table(name = "resident")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resident {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "gender", nullable = false)
    private String gender;

    @Column(name = "dob")
    private LocalDate dateOfBirth;

    @Column(name = "identity_no", nullable = false, unique = true, length = 50)
    private String identityNo;

    @Column(name = "phone")
    private String phone;

    @Column(name = "hometown")
    private String hometown;

    @Column(name = "occupation")
    private String occupation;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "relationship_to_head")
    private String relationshipToHead;

    @Column(name = "household_id")
    private String householdId;

    @Transient
    private String apartmentNo;

    @Transient
    private String householdHeadName;
}
