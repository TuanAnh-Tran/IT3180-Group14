package com.cnpm.apartment.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ResidentActivityLogDTO {
    private String id;
    private String actor;
    private String action;
    private String targetType;
    private String targetId;
    private String detail;
    private LocalDateTime createdAt;
}
