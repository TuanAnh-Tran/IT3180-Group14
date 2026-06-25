package com.cnpm.apartment.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserAccountDTO {
    private String username;
    private String email;
    private String fullname;
    private String room;
    private String phone;
    private String identityNo;
    private String role;
    private String status;
}
