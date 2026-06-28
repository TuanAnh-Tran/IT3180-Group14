package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.HouseholdRequest;
import com.cnpm.apartment.dto.ResidentRequest;
import com.cnpm.apartment.dto.UserAccountDTO;
import com.cnpm.apartment.model.Resident;
import com.cnpm.apartment.model.User;
import com.cnpm.apartment.model.enums.UserRole;
import com.cnpm.apartment.model.enums.UserStatus;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.NotificationRepository;
import com.cnpm.apartment.repository.ResidentRepository;
import com.cnpm.apartment.repository.UserRepository;
import com.cnpm.apartment.service.ResidentManagementService;
import com.cnpm.apartment.validation.VietnamDataRules;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final HouseholdRepository householdRepository;
    private final ResidentRepository residentRepository;
    private final ResidentManagementService residentManagementService;

    public UserController(
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            PasswordEncoder passwordEncoder,
            HouseholdRepository householdRepository,
            ResidentRepository residentRepository,
            ResidentManagementService residentManagementService) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.householdRepository = householdRepository;
        this.residentRepository = residentRepository;
        this.residentManagementService = residentManagementService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserAccountDTO>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.success(
                userRepository.findAll().stream().map(this::toDto).toList()));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<UserAccountDTO>> createUser(@RequestBody Map<String, String> request) {
        String username = VietnamDataRules.requireUsername(required(request, "username"));
        String password = VietnamDataRules.requirePassword(firstPresent(request, "password", "passwordHash"));
        String fullname = VietnamDataRules.requireText(firstPresent(request, "fullname", "fullName"), "Full Name");
        String identityNo = VietnamDataRules.requireCitizenId(required(request, "identityNo"), "Citizen ID");
        String phone = VietnamDataRules.requireVietnamMobile(required(request, "phone"), "Phone");
        UserRole role = toRole(value(request, "role"));
        String room = VietnamDataRules.optionalText(value(request, "room"));
        if (role == UserRole.ROLE_USER) {
            room = requireHouseholdCode(request, room);
        }
        String email = value(request, "email");
        if (email == null || email.isBlank()) {
            email = username + "@cyberspace.local";
        }
        email = VietnamDataRules.requireEmail(email, "Email");

        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists.");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already registered.");
        }
        if (userRepository.findByIdentityNo(identityNo).isPresent()) {
            throw new RuntimeException("Identity Card Number (CCCD) already registered.");
        }

        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(password))
                .email(email)
                .fullname(fullname)
                .room(room)
                .phone(phone)
                .identityNo(identityNo)
                .role(role)
                .status(UserStatus.APPROVED)
                .failedAttempts(0)
                .build();

        User saved = userRepository.save(user);
        if (saved.getRole() == UserRole.ROLE_USER) {
            syncResidentProfile(request, saved);
        }

        return ResponseEntity.ok(ApiResponse.success("User created successfully", toDto(saved)));
    }

    @PutMapping("/{username}/role")
    public ResponseEntity<ApiResponse<UserAccountDTO>> updateRole(
            @PathVariable String username,
            @RequestBody Map<String, String> request) {
        User user = userRepository.findByUsername(username.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (isCurrentUser(user.getUsername())) {
            throw new RuntimeException("You cannot change your own role.");
        }

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

    @PutMapping("/{username}/lock")
    public ResponseEntity<ApiResponse<UserAccountDTO>> lockUser(@PathVariable String username) {
        User user = userRepository.findByUsername(username.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (user.getRole() == UserRole.ROLE_ADMIN) {
            throw new RuntimeException("Admin accounts cannot be locked.");
        }
        if (user.getStatus() == UserStatus.LOCKED) {
            throw new RuntimeException("User is already locked.");
        }

        user.setStatus(UserStatus.LOCKED);
        user.setFailedAttempts(0);
        user.setLockTime(null);
        return ResponseEntity.ok(ApiResponse.success("User locked successfully", toDto(userRepository.save(user))));
    }

    @DeleteMapping("/{username}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String username) {
        User user = userRepository.findByUsername(username.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (isCurrentUser(user.getUsername())) {
            throw new RuntimeException("You cannot delete your own account.");
        }

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

    private void syncResidentProfile(Map<String, String> request, User user) {
        String householdCode = requireHouseholdCode(request, user.getRoom());

        Resident existingResident = residentRepository.findByIdentityNoIgnoreCase(user.getIdentityNo()).orElse(null);
        if (existingResident != null) {
            if (existingResident.getHousehold() != null) {
                user.setRoom(existingResident.getHousehold().getId());
                userRepository.save(user);
            }
            return;
        }

        if (!householdRepository.existsById(householdCode)) {
            HouseholdRequest householdRequest = new HouseholdRequest();
            householdRequest.setCode(householdCode);
            householdRequest.setApartmentNo(firstNonBlank(value(request, "apartmentNo"), value(request, "room"), householdCode));
            householdRequest.setFloor(parseOptionalInteger(value(request, "floor"), "Floor"));
            householdRequest.setArea(parsePositiveDouble(required(request, "area"), "Area"));
            householdRequest.setHeadName(firstNonBlank(value(request, "householdHeadName"), user.getFullname()));
            householdRequest.setPhone(user.getPhone());
            householdRequest.setHouseNo(firstNonBlank(value(request, "houseNo"), value(request, "apartmentNo"), value(request, "room")));
            householdRequest.setStreet(value(request, "street"));
            householdRequest.setWard(value(request, "ward"));
            householdRequest.setDistrict(value(request, "district"));
            householdRequest.setRegistrationDate(parseOptionalDate(value(request, "registrationDate"), "Registration date"));
            householdRequest.setStatus(firstNonBlank(value(request, "householdStatus"), "OCCUPIED"));
            householdRequest.setNote(value(request, "householdNote"));
            householdRequest.setMotorcycleCount(parseNonNegativeInteger(value(request, "motorcycleCount"), "Motorcycle count"));
            householdRequest.setCarCount(parseNonNegativeInteger(value(request, "carCount"), "Car count"));
            residentManagementService.createHousehold(householdRequest, user.getUsername());
        }

        ResidentRequest residentRequest = new ResidentRequest();
        residentRequest.setFullName(user.getFullname());
        residentRequest.setGender(value(request, "gender"));
        residentRequest.setDateOfBirth(parseOptionalDate(firstNonBlank(value(request, "dateOfBirth"), value(request, "dob")), "Date of birth"));
        residentRequest.setIdentityNo(user.getIdentityNo());
        residentRequest.setPhone(user.getPhone());
        residentRequest.setAlias(value(request, "alias"));
        residentRequest.setBirthPlace(value(request, "birthPlace"));
        residentRequest.setHometown(value(request, "hometown"));
        residentRequest.setEthnicity(value(request, "ethnicity"));
        residentRequest.setReligion(value(request, "religion"));
        residentRequest.setOccupation(value(request, "occupation"));
        residentRequest.setWorkplace(value(request, "workplace"));
        residentRequest.setIssueDate(parseOptionalDate(value(request, "issueDate"), "Citizen ID issue date"));
        residentRequest.setIssuePlace(value(request, "issuePlace"));
        residentRequest.setPreviousResidence(value(request, "previousResidence"));
        residentRequest.setRelationshipToHead(firstNonBlank(value(request, "relationshipToHead"), "Head"));
        residentRequest.setStatus(firstNonBlank(value(request, "residentStatus"), "PERMANENT"));
        residentRequest.setHouseholdId(householdCode);
        residentRequest.setAlive(true);
        residentManagementService.createResident(residentRequest, user.getUsername());

        user.setRoom(householdCode);
        userRepository.save(user);
    }

    private String requireHouseholdCode(Map<String, String> request, String fallback) {
        String householdCode = firstNonBlank(value(request, "householdCode"), fallback);
        if (householdCode == null) {
            throw new RuntimeException("Household code is required for resident accounts.");
        }
        return householdCode.trim().toUpperCase();
    }

    private String firstNonBlank(String... values) {
        for (String candidate : values) {
            if (candidate != null && !candidate.isBlank()) {
                return candidate.trim();
            }
        }
        return null;
    }

    private LocalDate parseOptionalDate(String value, String fieldName) {
        String cleaned = firstNonBlank(value);
        if (cleaned == null) {
            return null;
        }
        try {
            return LocalDate.parse(cleaned);
        } catch (Exception e) {
            throw new RuntimeException(fieldName + " must use yyyy-MM-dd format.");
        }
    }

    private Integer parseOptionalInteger(String value, String fieldName) {
        String cleaned = firstNonBlank(value);
        if (cleaned == null) {
            return null;
        }
        return parseNonNegativeInteger(cleaned, fieldName);
    }

    private int parseNonNegativeInteger(String value, String fieldName) {
        String cleaned = firstNonBlank(value);
        if (cleaned == null) {
            return 0;
        }
        try {
            int parsed = Integer.parseInt(cleaned);
            if (parsed < 0) {
                throw new RuntimeException(fieldName + " must be zero or greater.");
            }
            return parsed;
        } catch (NumberFormatException e) {
            throw new RuntimeException(fieldName + " must be a valid number.");
        }
    }

    private double parsePositiveDouble(String value, String fieldName) {
        try {
            double parsed = Double.parseDouble(value.trim());
            if (parsed <= 0) {
                throw new RuntimeException(fieldName + " must be greater than 0.");
            }
            return parsed;
        } catch (NumberFormatException e) {
            throw new RuntimeException(fieldName + " must be a valid number.");
        }
    }

    private boolean isCurrentUser(String username) {
        try {
            String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
            return currentUsername != null && currentUsername.equalsIgnoreCase(username);
        } catch (Exception e) {
            return false;
        }
    }
}
