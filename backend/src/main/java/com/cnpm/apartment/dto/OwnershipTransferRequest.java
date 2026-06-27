package com.cnpm.apartment.dto;

import com.cnpm.apartment.validation.VietnamDataRules;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class OwnershipTransferRequest {
    @Pattern(regexp = VietnamDataRules.OPTIONAL_CITIZEN_ID_REGEX,
            message = "New owner Citizen ID must contain exactly 12 digits and start with a valid Vietnamese province/city code")
    private String newOwnerIdentityNo;

    @NotBlank(message = "New owner name is required")
    @Size(max = 255, message = "New owner name must be at most 255 characters")
    private String newOwnerName;

    @Pattern(regexp = VietnamDataRules.OPTIONAL_VIETNAM_MOBILE_REGEX,
            message = "Phone must be a Vietnamese mobile number with 10 digits")
    private String newOwnerPhone;

    @Size(max = 1000, message = "Note must be at most 1000 characters")
    private String note;
}
