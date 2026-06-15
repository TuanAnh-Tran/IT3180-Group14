package com.cnpm.apartment.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class HouseholdDTO {
    private String id;
    private String code;
    private String apartmentNo;
    private Integer floor;
    private double area;
    private String headName;
    private String phone;
    private String status;
    private String note;
    private int memberCount;
    private int motorcycleCount;
    private int carCount;
    private List<ResidentDTO> members;
}
