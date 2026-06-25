package com.cnpm.apartment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String type = "Bearer";
    private String username;
    private String fullname;
    private String role;
    private String room;
    private String phone;
    private String identityNo;
    
    public AuthResponse(String token, String username, String fullname, String role, String room, String phone, String identityNo) {
        this.token = token;
        this.username = username;
        this.fullname = fullname;
        this.role = role;
        this.room = room;
        this.phone = phone;
        this.identityNo = identityNo;
    }
}
