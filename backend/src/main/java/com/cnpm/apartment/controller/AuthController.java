package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.*;
import com.cnpm.apartment.model.User;
import com.cnpm.apartment.model.enums.UserRole;
import com.cnpm.apartment.model.enums.UserStatus;
import com.cnpm.apartment.repository.UserRepository;
import com.cnpm.apartment.security.JwtTokenProvider;
import com.cnpm.apartment.validation.VietnamDataRules;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest request) {
        String username = VietnamDataRules.requireUsername(request.getUsername());
        String email = VietnamDataRules.requireEmail(request.getEmail(), "Email");
        String fullname = VietnamDataRules.requireText(request.getFullname(), "Full Name");
        String phone = VietnamDataRules.requireVietnamMobile(request.getPhone(), "Phone");
        String identityNo = VietnamDataRules.requireCitizenId(request.getIdentityNo(), "Citizen ID");
        String password = VietnamDataRules.requirePassword(request.getPassword());

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body("Username already exists.");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body("Email already registered.");
        }
        if (userRepository.findByIdentityNo(identityNo).isPresent()) {
            return ResponseEntity.badRequest().body("Identity Card Number (CCCD) already registered.");
        }

        UserRole role = UserRole.ROLE_USER;
        UserStatus status = UserStatus.PENDING;

        if (request.getRole() != null) {
            String roleUpper = request.getRole().toUpperCase();
            if (roleUpper.contains("ADMIN")) {
                role = UserRole.ROLE_ADMIN;
            } else if (roleUpper.contains("ACCOUNTANT")) {
                role = UserRole.ROLE_ACCOUNTANT;
            }
        }

        // Validate admin secret key if role is admin or accountant
        if (role == UserRole.ROLE_ADMIN || role == UserRole.ROLE_ACCOUNTANT) {
            String secret = request.getAdminSecret();
            if (secret == null || !secret.equals("CYBER@ADMIN2025")) {
                return ResponseEntity.badRequest().body("Invalid Admin Secret Key. Registration rejected.");
            }
            status = UserStatus.APPROVED; // Admins and Accountants are approved automatically
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .fullname(fullname)
                .room(VietnamDataRules.optionalText(request.getRoom()))
                .phone(phone)
                .identityNo(identityNo)
                .passwordHash(passwordEncoder.encode(password))
                .role(role)
                .status(status)
                .failedAttempts(0)
                .build();

        userRepository.save(user);

        if (status == UserStatus.APPROVED) {
            String token = tokenProvider.generateToken(user.getUsername());
            AuthResponse response = AuthResponse.builder()
                    .token(token)
                    .username(user.getUsername())
                    .fullname(user.getFullname())
                    .role(user.getRole().name().replace("ROLE_", "").toLowerCase())
                    .room(user.getRoom())
                    .phone(user.getPhone())
                    .identityNo(user.getIdentityNo())
                    .build();
            return ResponseEntity.ok(response);
        }

        return ResponseEntity.ok("Registration successful. Please wait for Admin approval.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@Valid @RequestBody LoginRequest request) {
        String username = request.getUsername().toLowerCase().trim();
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Incorrect username or password.");
        }

        User user = userOpt.get();

        // Check if locked
        if (user.getStatus() == UserStatus.LOCKED) {
            boolean temporaryLock = user.getFailedAttempts() != null
                    && user.getFailedAttempts() >= 5
                    && user.getLockTime() != null;
            if (temporaryLock && user.getLockTime().plusMinutes(15).isBefore(LocalDateTime.now())) {
                user.setStatus(UserStatus.APPROVED);
                user.setFailedAttempts(0);
                user.setLockTime(null);
                userRepository.save(user);
            } else {
                return ResponseEntity.status(403).body("This account has been locked due to multiple failed login attempts. Please contact admin or try again in 15 minutes.");
            }
        }

        if (user.getStatus() == UserStatus.PENDING) {
            return ResponseEntity.status(403).body("This account is pending approval by Admin.");
        }

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int attempts = user.getFailedAttempts() == null ? 0 : user.getFailedAttempts();
            attempts++;
            user.setFailedAttempts(attempts);

            if (attempts >= 5) {
                user.setStatus(UserStatus.LOCKED);
                user.setLockTime(LocalDateTime.now());
                userRepository.save(user);
                return ResponseEntity.status(403).body("This account has been locked due to 5 consecutive failed login attempts.");
            }

            userRepository.save(user);
            return ResponseEntity.status(401).body("Incorrect username or password. (" + attempts + "/5 attempts)");
        }

        // Reset failed login count
        user.setFailedAttempts(0);
        user.setLockTime(null);
        userRepository.save(user);

        // Generate token
        String token = tokenProvider.generateToken(user.getUsername());

        AuthResponse response = AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .fullname(user.getFullname())
                .role(user.getRole().name().replace("ROLE_", "").toLowerCase())
                .room(user.getRoom())
                .phone(user.getPhone())
                .identityNo(user.getIdentityNo())
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            return ResponseEntity.badRequest().body("Current password is incorrect.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.ok("Password changed successfully.");
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        String email = VietnamDataRules.requireEmail(request.getEmail(), "Email");
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String otp = String.format("%06d", new Random().nextInt(1000000));
            user.setOtpCode(otp);
            user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
            userRepository.save(user);

            // Print OTP to log console as mock email sender
            System.out.println("\n=======================================================");
            System.out.println("MOCK SMTP SERVER: PASSWORD RESET REQUEST FOR " + user.getEmail());
            System.out.println("OTP CODE IS: " + otp);
            System.out.println("EXPIRY AT: " + user.getOtpExpiry());
            System.out.println("=======================================================\n");
        }

        return ResponseEntity.ok("If the email address exists in the system, an OTP code has been generated. Please check console logs to view the OTP.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        String email = VietnamDataRules.requireEmail(request.getEmail(), "Email");
        String newPassword = VietnamDataRules.requirePassword(request.getNewPassword());
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Email address not found.");
        }

        User user = userOpt.get();
        if (user.getOtpCode() == null || !user.getOtpCode().equals(request.getOtp())) {
            return ResponseEntity.badRequest().body("Invalid OTP code.");
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body("OTP code has expired.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        user.setFailedAttempts(0);
        user.setLockTime(null);
        if (user.getStatus() == UserStatus.LOCKED) {
            user.setStatus(UserStatus.APPROVED);
        }
        userRepository.save(user);

        return ResponseEntity.ok("Password reset successfully. You can now log in with your new password.");
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody User profileDetails) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        String fullname = VietnamDataRules.requireText(profileDetails.getFullname(), "Full Name");
        String phone = VietnamDataRules.optionalVietnamMobile(profileDetails.getPhone(), "Phone");

        user.setFullname(fullname);
        user.setPhone(phone);
        user.setRoom(VietnamDataRules.optionalText(profileDetails.getRoom()));
        userRepository.save(user);

        return ResponseEntity.ok(user);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        return ResponseEntity.ok(user);
    }
}
