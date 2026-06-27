package com.cnpm.apartment.dto;

import com.cnpm.apartment.validation.VietnamDataRules;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {
    @NotBlank
    @Pattern(regexp = VietnamDataRules.USERNAME_REGEX,
            message = "Username must be 4-50 characters and may contain lowercase letters, digits, dots, underscores or hyphens")
    private String username;

    @NotBlank
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank
    @Size(max = 255, message = "Full name must be at most 255 characters")
    private String fullname;

    private String room;

    @NotBlank
    @Pattern(regexp = VietnamDataRules.VIETNAM_MOBILE_REGEX,
            message = "Phone must be a Vietnamese mobile number with 10 digits")
    private String phone;

    @NotBlank
    @Pattern(regexp = VietnamDataRules.CITIZEN_ID_REGEX,
            message = "Citizen ID must contain exactly 12 digits and start with a valid Vietnamese province/city code")
    private String identityNo;

    @NotBlank
    @Size(min = 6, max = 72, message = "Password must be 6-72 characters")
    private String password;

    private String adminSecret;

    private String role;
}
