package com.cnpm.apartment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User {
    @Id
    @Column(length = 50)
    private String id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name")
    private String fullName;

    private String role;
    
    private String room;
    
    private String phone;
    
    @Column(name = "identity_no")
    private String identityNo;

    @Column(nullable = false)
    private String status; // ACTIVE, PENDING, LOCKED

    @Column(name = "failed_login_attempts")
    private int failedLoginAttempts;

    @Column(unique = true)
    private String email;

    @Column(name = "reset_otp", length = 10)
    private String resetOtp;

    @Column(name = "reset_otp_expiry")
    private java.time.LocalDateTime resetOtpExpiry;

    private String street;

    private String ward;

    private String district;
}
