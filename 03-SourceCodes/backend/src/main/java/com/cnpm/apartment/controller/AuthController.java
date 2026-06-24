package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.AuthResponse;
import com.cnpm.apartment.dto.ForgotPasswordRequest;
import com.cnpm.apartment.dto.LoginRequest;
import com.cnpm.apartment.dto.RegisterRequest;
import com.cnpm.apartment.dto.ResetPasswordRequest;
import com.cnpm.apartment.model.User;
import com.cnpm.apartment.repository.UserRepository;
import com.cnpm.apartment.security.JwtTokenProvider;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.Collections;
import com.cnpm.apartment.repository.ResidentRepository;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.model.Resident;
import com.cnpm.apartment.model.Household;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private JwtTokenProvider tokenProvider;

    @org.springframework.beans.factory.annotation.Value("${app.admin.secret}")
    private String adminSecret;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResidentRepository residentRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        User user = userRepository.findByUsername(loginRequest.getUsername()).orElse(null);
        
        if (user == null) {
            return ResponseEntity.badRequest().body("Incorrect username or password!");
        }

        if ("LOCKED".equals(user.getStatus())) {
            return ResponseEntity.badRequest().body("Account is locked!");
        }

        if ("PENDING".equals(user.getStatus())) {
            return ResponseEntity.badRequest().body("Account is pending approval!");
        }

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPasswordHash())) {
            int attempts = user.getFailedLoginAttempts();
            attempts++;
            if (attempts >= 5) {
                user.setStatus("LOCKED");
            }
            user.setFailedLoginAttempts(attempts);
            userRepository.save(user);
            
            if (attempts >= 5) {
                return ResponseEntity.badRequest().body("Account has been locked due to too many failed attempts!");
            }
            return ResponseEntity.badRequest().body("Incorrect username or password!");
        }

        // Reset failed attempts on successful login
        user.setFailedLoginAttempts(0);
        userRepository.save(user);

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                user.getUsername(), user.getPasswordHash(), Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().toLowerCase())));
        
        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = tokenProvider.generateToken(authentication);

        return ResponseEntity.ok(new AuthResponse(
                jwt,
                user.getUsername(),
                user.getFullName(),
                user.getRole().toLowerCase(),
                user.getRoom(),
                user.getPhone(),
                user.getIdentityNo()
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            return ResponseEntity.badRequest().body("Username already exists!");
        }
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            return ResponseEntity.badRequest().body("Email already exists!");
        }
        if (registerRequest.getIdentityNo() != null && !registerRequest.getIdentityNo().isEmpty() && userRepository.existsByIdentityNo(registerRequest.getIdentityNo())) {
            return ResponseEntity.badRequest().body("Citizen ID (CCCD) already registered to another account!");
        }

        User user = new User();
        user.setId("USR-" + System.currentTimeMillis());
        user.setUsername(registerRequest.getUsername());
        user.setFullName(registerRequest.getFullname());
        user.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
        user.setRoom(registerRequest.getRoom());
        user.setPhone(registerRequest.getPhone());
        user.setEmail(registerRequest.getEmail());
        user.setIdentityNo(registerRequest.getIdentityNo());

        // Check Admin Secret
        if (registerRequest.getAdminSecret() != null && registerRequest.getAdminSecret().equals(adminSecret)) {
            user.setRole("admin");
            user.setStatus("APPROVED");
        } else {
            user.setRole("user"); // default role
            user.setStatus("PENDING"); // requires admin approval
        }

        user.setFailedLoginAttempts(0);

        userRepository.save(user);

        return ResponseEntity.ok("Registration successful. Please wait for admin approval.");
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("Email not found!");
        }

        // Generate 6-digit OTP
        String otp = String.format("%06d", new java.util.Random().nextInt(999999));
        user.setResetOtp(otp);
        user.setResetOtpExpiry(java.time.LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        // Mock Email Sending
        System.out.println("=========================================================");
        System.out.println("MOCK EMAIL SENT TO: " + user.getEmail());
        System.out.println("SUBJECT: Password Reset OTP");
        System.out.println("BODY: Your OTP code is: " + otp + ". It expires in 5 minutes.");
        System.out.println("=========================================================");

        return ResponseEntity.ok("OTP sent to your email.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("Email not found!");
        }

        if (user.getResetOtp() == null || !user.getResetOtp().equals(request.getOtp())) {
            return ResponseEntity.badRequest().body("Invalid OTP!");
        }

        if (user.getResetOtpExpiry() != null && user.getResetOtpExpiry().isBefore(java.time.LocalDateTime.now())) {
            return ResponseEntity.badRequest().body("OTP has expired!");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setResetOtp(null);
        user.setResetOtpExpiry(null);
        // Also unlock account if it was locked due to max attempts
        user.setFailedLoginAttempts(0);
        if ("LOCKED".equals(user.getStatus())) {
            user.setStatus("APPROVED");
        }
        
        userRepository.save(user);

        return ResponseEntity.ok("Password has been reset successfully. You can now login.");
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody java.util.Map<String, String> request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        
        String username = auth.getName();
        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");
        
        if (currentPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body("Current password and new password are required!");
        }
        
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body("New password must be at least 6 characters long!");
        }
        
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found!");
        }
        
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return ResponseEntity.badRequest().body("Current password is incorrect!");
        }
        
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        return ResponseEntity.ok("Password changed successfully.");
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        
        String username = auth.getName();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found!");
        }

        Resident resident = null;
        if (user.getIdentityNo() != null && !user.getIdentityNo().isEmpty()) {
            resident = residentRepository.findByIdentityNo(user.getIdentityNo()).orElse(null);
        }

        Household household = null;
        if (resident != null && resident.getHouseholdId() != null && !resident.getHouseholdId().isEmpty()) {
            household = householdRepository.findById(resident.getHouseholdId()).orElse(null);
        } else if (user.getRoom() != null && !user.getRoom().isEmpty()) {
            household = householdRepository.findById(user.getRoom()).orElse(null);
        }

        Map<String, Object> profile = new HashMap<>();
        profile.put("username", user.getUsername());
        profile.put("fullname", user.getFullName());
        profile.put("role", user.getRole());
        profile.put("room", user.getRoom());
        profile.put("phone", user.getPhone());
        profile.put("identityNo", user.getIdentityNo());
        profile.put("email", user.getEmail());
        
        profile.put("dob", resident != null && resident.getDateOfBirth() != null ? resident.getDateOfBirth() : "");
        profile.put("alias", resident != null && resident.getAlias() != null ? resident.getAlias() : "");
        profile.put("birthPlace", resident != null && resident.getBirthPlace() != null ? resident.getBirthPlace() : "");
        profile.put("hometown", resident != null && resident.getHometown() != null ? resident.getHometown() : "");
        profile.put("ethnicity", resident != null && resident.getEthnicity() != null ? resident.getEthnicity() : "");
        profile.put("occupation", resident != null && resident.getOccupation() != null ? resident.getOccupation() : "");
        profile.put("workplace", resident != null && resident.getWorkplace() != null ? resident.getWorkplace() : "");
        profile.put("issueDate", resident != null && resident.getIssueDate() != null ? resident.getIssueDate() : "");
        profile.put("issuePlace", resident != null && resident.getIssuePlace() != null ? resident.getIssuePlace() : "");
        profile.put("previousResidence", resident != null && resident.getPreviousResidence() != null ? resident.getPreviousResidence() : "");
        
        profile.put("householdCode", resident != null && resident.getHouseholdId() != null ? resident.getHouseholdId() : "");
        profile.put("householdHeadName", household != null && household.getOwnerName() != null ? household.getOwnerName() : "");
        profile.put("houseNo", household != null && household.getId() != null ? household.getId() : "");
        profile.put("street", user.getStreet() != null ? user.getStreet() : "");
        profile.put("ward", user.getWard() != null ? user.getWard() : "");
        profile.put("district", user.getDistrict() != null ? user.getDistrict() : "");

        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        
        String username = auth.getName();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found!");
        }

        String newIdentityNo = request.get("identityNo");
        if (newIdentityNo != null && !newIdentityNo.isEmpty() && !newIdentityNo.equals(user.getIdentityNo())) {
            if (userRepository.existsByIdentityNo(newIdentityNo)) {
                return ResponseEntity.badRequest().body("Citizen ID (CCCD/CMND) already registered to another account!");
            }
        }

        user.setFullName(request.get("fullname"));
        user.setPhone(request.get("phone"));
        user.setRoom(request.get("room"));
        user.setIdentityNo(newIdentityNo);
        user.setStreet(request.get("street"));
        user.setWard(request.get("ward"));
        user.setDistrict(request.get("district"));
        userRepository.save(user);

        // 1. Load resident
        Resident resident = null;
        if (newIdentityNo != null && !newIdentityNo.isEmpty()) {
            resident = residentRepository.findByIdentityNo(newIdentityNo).orElse(null);
        }
        if (resident == null && newIdentityNo != null && !newIdentityNo.isEmpty()) {
            resident = new Resident();
            resident.setId("RES-" + System.currentTimeMillis());
            resident.setIdentityNo(newIdentityNo);
            resident.setStatus("PERMANENT");
            resident.setGender("Other");
        }

        // 2. Save Household FIRST
        String householdCode = request.get("householdCode");
        Household household = null;
        if (householdCode != null && !householdCode.isEmpty()) {
            household = householdRepository.findById(householdCode).orElse(null);
            if (household == null) {
                household = new Household();
                household.setId(householdCode);
                household.setOwnerName(request.get("householdHeadName") != null && !request.get("householdHeadName").isEmpty() ? request.get("householdHeadName") : request.get("fullname"));
                household.setApartmentNo(request.get("houseNo") != null && !request.get("houseNo").isEmpty() ? request.get("houseNo") : request.get("room"));
                household.setFloor(1); // Default floor
                household.setStatus("OCCUPIED");
                household.setMembersCount(1);
            } else {
                if (request.get("householdHeadName") != null && !request.get("householdHeadName").isEmpty()) {
                    household.setOwnerName(request.get("householdHeadName"));
                }
                if (request.get("houseNo") != null && !request.get("houseNo").isEmpty()) {
                    household.setApartmentNo(request.get("houseNo"));
                }
            }
            householdRepository.saveAndFlush(household);
        }

        // 3. Save Resident SECOND
        if (resident != null) {
            resident.setFullName(request.get("fullname"));
            resident.setPhone(request.get("phone"));
            resident.setAlias(request.get("alias"));
            resident.setDateOfBirth(request.get("dob"));
            resident.setBirthPlace(request.get("birthPlace"));
            resident.setHometown(request.get("hometown"));
            resident.setEthnicity(request.get("ethnicity"));
            resident.setOccupation(request.get("occupation"));
            resident.setWorkplace(request.get("workplace"));
            resident.setIssueDate(request.get("issueDate"));
            resident.setIssuePlace(request.get("issuePlace"));
            resident.setPreviousResidence(request.get("previousResidence"));
            resident.setHouseholdId(householdCode);
            residentRepository.save(resident);
        }

        Map<String, Object> profile = new HashMap<>();
        profile.put("username", user.getUsername());
        profile.put("fullname", user.getFullName());
        profile.put("role", user.getRole());
        profile.put("room", user.getRoom());
        profile.put("phone", user.getPhone());
        profile.put("identityNo", user.getIdentityNo());
        profile.put("email", user.getEmail());
        
        profile.put("dob", resident != null && resident.getDateOfBirth() != null ? resident.getDateOfBirth() : "");
        profile.put("alias", resident != null && resident.getAlias() != null ? resident.getAlias() : "");
        profile.put("birthPlace", resident != null && resident.getBirthPlace() != null ? resident.getBirthPlace() : "");
        profile.put("hometown", resident != null && resident.getHometown() != null ? resident.getHometown() : "");
        profile.put("ethnicity", resident != null && resident.getEthnicity() != null ? resident.getEthnicity() : "");
        profile.put("occupation", resident != null && resident.getOccupation() != null ? resident.getOccupation() : "");
        profile.put("workplace", resident != null && resident.getWorkplace() != null ? resident.getWorkplace() : "");
        profile.put("issueDate", resident != null && resident.getIssueDate() != null ? resident.getIssueDate() : "");
        profile.put("issuePlace", resident != null && resident.getIssuePlace() != null ? resident.getIssuePlace() : "");
        profile.put("previousResidence", resident != null && resident.getPreviousResidence() != null ? resident.getPreviousResidence() : "");
        
        profile.put("householdCode", resident != null && resident.getHouseholdId() != null ? resident.getHouseholdId() : "");
        profile.put("householdHeadName", household != null && household.getOwnerName() != null ? household.getOwnerName() : "");
        profile.put("houseNo", household != null && household.getId() != null ? household.getId() : "");
        profile.put("street", user.getStreet() != null ? user.getStreet() : "");
        profile.put("ward", user.getWard() != null ? user.getWard() : "");
        profile.put("district", user.getDistrict() != null ? user.getDistrict() : "");

        return ResponseEntity.ok(profile);
    }
}
