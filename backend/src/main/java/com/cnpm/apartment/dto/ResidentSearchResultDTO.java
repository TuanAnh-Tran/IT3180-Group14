package com.cnpm.apartment.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ResidentSearchResultDTO {
    private String type;
    private String id;
    private String mainInfo;
    private String detail;
}
