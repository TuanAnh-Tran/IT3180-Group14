package com.cnpm.apartment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class OwnershipTransferRequest {
    private String newOwnerIdentityNo;

    @NotBlank(message = "New owner name is required")
    @Size(max = 255, message = "New owner name must be at most 255 characters")
    private String newOwnerName;

    @Size(max = 30, message = "Phone must be at most 30 characters")
    private String newOwnerPhone;

    @Size(max = 1000, message = "Note must be at most 1000 characters")
    private String note;
}
