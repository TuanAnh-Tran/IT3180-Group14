package com.cnpm.apartment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Username cannot be blank")
    private String username;

    @NotBlank(message = "Full name cannot be blank")
    private String fullname;

    @NotBlank(message = "Password cannot be blank")
    private String password;

    @NotBlank(message = "Email cannot be blank")
    private String email;

    private String room;
    private String phone;
    private String identityNo;
    private String adminSecret;
}
