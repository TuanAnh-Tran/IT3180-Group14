package com.cnpm.apartment.controller;

import com.cnpm.apartment.model.User;
import com.cnpm.apartment.model.enums.UserStatus;
import com.cnpm.apartment.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ROLE_ADMIN')")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PutMapping("/{username}/approve")
    public ResponseEntity<?> approveUser(@PathVariable String username) {
        User user = userRepository.findByUsername(username.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (user.getStatus() != UserStatus.PENDING) {
            return ResponseEntity.badRequest().body("User is not pending approval.");
        }

        user.setStatus(UserStatus.APPROVED);
        userRepository.save(user);
        return ResponseEntity.ok("User approved successfully.");
    }

    @PutMapping("/{username}/unlock")
    public ResponseEntity<?> unlockUser(@PathVariable String username) {
        User user = userRepository.findByUsername(username.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (user.getStatus() != UserStatus.LOCKED) {
            return ResponseEntity.badRequest().body("User is not locked.");
        }

        user.setStatus(UserStatus.APPROVED);
        user.setFailedAttempts(0);
        user.setLockTime(null);
        userRepository.save(user);
        return ResponseEntity.ok("User unlocked successfully.");
    }

    @DeleteMapping("/{username}")
    public ResponseEntity<?> deleteUser(@PathVariable String username) {
        User user = userRepository.findByUsername(username.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        userRepository.delete(user);
        return ResponseEntity.ok("User deleted successfully.");
    }
}
