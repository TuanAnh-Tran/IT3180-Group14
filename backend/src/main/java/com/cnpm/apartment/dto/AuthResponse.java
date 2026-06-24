package com.cnpm.apartment.dto;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private String username;
    private String fullname;
    private String role;
    private String room;
    private String phone;
    private String identityNo;
}
