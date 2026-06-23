package com.cnpm.apartment.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ResidentDTO {
    private String id;
    private String fullName;
    private String gender;
    private LocalDate dateOfBirth;
    private String identityNo;
    private String phone;
    private String alias;
    private String birthPlace;
    private String hometown;
    private String ethnicity;
    private String religion;
    private String occupation;
    private String workplace;
    private LocalDate issueDate;
    private String issuePlace;
    private String previousResidence;
    private String relationshipToHead;
    private String status;
    private boolean alive;
    private LocalDate dateOfDeath;
    private boolean archived;
    private String householdId;
    private String apartmentNo;
    private String householdHeadName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
