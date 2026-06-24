package com.cnpm.apartment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {
    @NotBlank
    private String username;
    @NotBlank
    private String email;
    @NotBlank
    private String fullname;
    private String room;
    private String phone;
    @NotBlank
    private String identityNo;
    @NotBlank
    private String password;
    private String adminSecret;
    private String role;
}
