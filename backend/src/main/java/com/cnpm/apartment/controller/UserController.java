package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.UserAccountDTO;
import com.cnpm.apartment.model.User;
import com.cnpm.apartment.model.enums.UserRole;
import com.cnpm.apartment.model.enums.UserStatus;
import com.cnpm.apartment.repository.NotificationRepository;
import com.cnpm.apartment.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserAccountDTO>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.success(
                userRepository.findAll().stream().map(this::toDto).toList()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserAccountDTO>> createUser(@RequestBody Map<String, String> request) {
        String username = required(request, "username").toLowerCase().trim();
        String password = firstPresent(request, "password", "passwordHash");
        String fullname = firstPresent(request, "fullname", "fullName");
        String identityNo = required(request, "identityNo").trim();
        String email = value(request, "email");
        if (email == null || email.isBlank()) {
            email = username + "@cyberspace.local";
        }

        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists.");
        }
        if (userRepository.findByEmail(email.trim()).isPresent()) {
            throw new RuntimeException("Email already registered.");
        }
        if (userRepository.findByIdentityNo(identityNo).isPresent()) {
            throw new RuntimeException("Identity Card Number (CCCD) already registered.");
        }

        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(password))
                .email(email.trim())
                .fullname(fullname.trim())
                .room(value(request, "room"))
                .phone(value(request, "phone"))
                .identityNo(identityNo)
                .role(toRole(value(request, "role")))
                .status(UserStatus.APPROVED)
                .failedAttempts(0)
                .build();

        return ResponseEntity.ok(ApiResponse.success("User created successfully", toDto(userRepository.save(user))));
    }

    @PutMapping("/{username}/role")
    public ResponseEntity<ApiResponse<UserAccountDTO>> updateRole(
            @PathVariable String username,
            @RequestBody Map<String, String> request) {
        User user = userRepository.findByUsername(username.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        user.setRole(toRole(value(request, "role")));
        return ResponseEntity.ok(ApiResponse.success("User role updated successfully", toDto(userRepository.save(user))));
    }

    @PutMapping("/{username}/approve")
    public ResponseEntity<ApiResponse<UserAccountDTO>> approveUser(@PathVariable String username) {
        User user = userRepository.findByUsername(username.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (user.getStatus() != UserStatus.PENDING) {
            throw new RuntimeException("User is not pending approval.");
        }

        user.setStatus(UserStatus.APPROVED);
        return ResponseEntity.ok(ApiResponse.success("User approved successfully", toDto(userRepository.save(user))));
    }

    @PutMapping("/{username}/unlock")
    public ResponseEntity<ApiResponse<UserAccountDTO>> unlockUser(@PathVariable String username) {
        User user = userRepository.findByUsername(username.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (user.getStatus() != UserStatus.LOCKED) {
            throw new RuntimeException("User is not locked.");
        }

        user.setStatus(UserStatus.APPROVED);
        user.setFailedAttempts(0);
        user.setLockTime(null);
        return ResponseEntity.ok(ApiResponse.success("User unlocked successfully", toDto(userRepository.save(user))));
    }

    @DeleteMapping("/{username}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String username) {
        User user = userRepository.findByUsername(username.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        notificationRepository.deleteByTargetUsername(user.getUsername());
        userRepository.delete(user);
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully", null));
    }

    private UserAccountDTO toDto(User user) {
        return UserAccountDTO.builder()
                .username(user.getUsername())
                .email(user.getEmail())
                .fullname(user.getFullname())
                .room(user.getRoom())
                .phone(user.getPhone())
                .identityNo(user.getIdentityNo())
                .role(user.getRole().name().replace("ROLE_", "").toLowerCase())
                .status(user.getStatus().name())
                .build();
    }

    private UserRole toRole(String role) {
        String normalized = role == null ? "user" : role.toUpperCase().trim();
        if (normalized.contains("ADMIN")) {
            return UserRole.ROLE_ADMIN;
        }
        if (normalized.contains("ACCOUNTANT")) {
            return UserRole.ROLE_ACCOUNTANT;
        }
        return UserRole.ROLE_USER;
    }

    private String required(Map<String, String> request, String key) {
        String value = value(request, key);
        if (value == null || value.isBlank()) {
            throw new RuntimeException(key + " is required.");
        }
        return value;
    }

    private String firstPresent(Map<String, String> request, String firstKey, String secondKey) {
        String first = value(request, firstKey);
        if (first != null && !first.isBlank()) {
            return first;
        }
        return required(request, secondKey);
    }

    private String value(Map<String, String> request, String key) {
        return request.get(key);
    }
}
