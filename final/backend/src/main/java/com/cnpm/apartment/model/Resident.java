package com.cnpm.apartment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "resident")
public class Resident {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    private String gender;

    @Column(name = "date_of_birth")
    private String dateOfBirth;

    @Column(name = "identity_no")
    private String identityNo;

    private String phone;
    private String hometown;
    private String ethnicity;
    private String occupation;
    private String workplace;
    private String status;

    @Column(name = "issue_date")
    private String issueDate;

    @Column(name = "issue_place")
    private String issuePlace;

    @Column(name = "previous_residence")
    private String previousResidence;

    private String alias;

    @Column(name = "birth_place")
    private String birthPlace;

    @Column(name = "household_id")
    private String householdId;
}
