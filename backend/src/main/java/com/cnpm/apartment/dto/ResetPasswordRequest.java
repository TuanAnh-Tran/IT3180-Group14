package com.cnpm.apartment.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {
    @NotBlank
    @Email
    private String email;
    @NotBlank
    private String otp;
    @NotBlank
    private String newPassword;
}
