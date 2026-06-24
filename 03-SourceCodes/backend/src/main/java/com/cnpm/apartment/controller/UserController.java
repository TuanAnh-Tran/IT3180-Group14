package com.cnpm.apartment.controller;

import com.cnpm.apartment.model.User;
import com.cnpm.apartment.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.cnpm.apartment.dto.ApiResponse;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.success(userRepository.findAll()));
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username already exists!"));
        }
        if (user.getIdentityNo() != null && !user.getIdentityNo().isEmpty() && userRepository.existsByIdentityNo(user.getIdentityNo())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Citizen ID (CCCD) already registered to another account!"));
        }
        user.setId("USR-" + System.currentTimeMillis());
        // Default password to 123456 if not provided
        if (user.getPasswordHash() == null || user.getPasswordHash().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode("123456"));
        } else {
            user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        }
        user.setStatus("ACTIVE");
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PutMapping("/{username}/role")
    public ResponseEntity<?> updateRole(@PathVariable String username, @RequestBody Map<String, String> request) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }
        User user = userOpt.get();
        user.setRole(request.get("role"));
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Role updated successfully")));
    }

    @PutMapping("/{username}/approve")
    public ResponseEntity<?> approveUser(@PathVariable String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }
        User user = userOpt.get();
        user.setStatus("ACTIVE");
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "User approved successfully")));
    }

    @PutMapping("/{username}/unlock")
    public ResponseEntity<?> unlockUser(@PathVariable String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }
        User user = userOpt.get();
        user.setStatus("ACTIVE");
        user.setFailedLoginAttempts(0);
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "User unlocked successfully")));
    }


    @DeleteMapping("/{username}")
    public ResponseEntity<?> deleteUser(@PathVariable String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }
        userRepository.delete(userOpt.get());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "User deleted successfully")));
    }
}
