package com.cnpm.apartment.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class HouseholdDTO {
    private String id;
    private String code;
    private String apartmentNo;
    private Integer floor;
    private double area;
    private String ownerName;
    private String headName;
    private String headResidentId;
    private String headIdentityNo;
    private String phone;
    private String houseNo;
    private String street;
    private String ward;
    private String district;
    private LocalDate registrationDate;
    private String status;
    private String note;
    private int memberCount;
    private int membersCount;
    private int activeMemberCount;
    private int motorcycleCount;
    private int carCount;
    private String previousOwnerName;
    private LocalDateTime ownershipTransferredAt;
    private String ownershipNote;
    private boolean headChangeRequired;
    private boolean archived;
    private LocalDateTime archivedAt;
    private List<ResidentDTO> members;
}
