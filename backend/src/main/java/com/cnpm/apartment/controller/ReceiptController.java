package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.ReceiptDTO;
import com.cnpm.apartment.model.User;
import com.cnpm.apartment.model.enums.UserRole;
import com.cnpm.apartment.repository.UserRepository;
import com.cnpm.apartment.service.ReceiptService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/receipts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReceiptController {

    private final ReceiptService receiptService;
    private final UserRepository userRepository;

    /**
     * GET /api/receipts
     * Lịch sử đóng phí, lọc theo hộ và khoảng thời gian.
     *
     * Params:
     *  - householdId (optional)
     *  - from        (optional) yyyy-MM-dd'T'HH:mm:ss
     *  - to          (optional) yyyy-MM-dd'T'HH:mm:ss
     *  - page, size
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<Page<ReceiptDTO>>> getHistory(
            @RequestParam(required = false) String householdId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "paidAt"));
        Page<ReceiptDTO> result = receiptService.getHistory(allowedHouseholdId(householdId), from, to, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * GET /api/receipts/{id}
     * Lấy chi tiết một biên lai cụ thể.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<ReceiptDTO>> getById(@PathVariable String id) {
        ReceiptDTO dto = receiptService.getById(id);
        User currentUser = currentUser();
        if (currentUser.getRole() == UserRole.ROLE_USER) {
            String ownHouseholdId = currentUser.getRoom();
            if (ownHouseholdId == null || ownHouseholdId.isBlank()) {
                throw new RuntimeException("Your account is not linked to a household.");
            }
            if (!ownHouseholdId.equalsIgnoreCase(dto.getHouseholdId())) {
                throw new RuntimeException("Residents can only access receipts for their own household.");
            }
        }
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    private String allowedHouseholdId(String requestedHouseholdId) {
        User currentUser = currentUser();
        if (currentUser.getRole() != UserRole.ROLE_USER) {
            return requestedHouseholdId;
        }

        String ownHouseholdId = currentUser.getRoom();
        if (ownHouseholdId == null || ownHouseholdId.isBlank()) {
            throw new RuntimeException("Your account is not linked to a household.");
        }
        if (requestedHouseholdId != null && !requestedHouseholdId.isBlank()
                && !ownHouseholdId.equalsIgnoreCase(requestedHouseholdId.trim())) {
            throw new RuntimeException("Residents can only view receipts for their own household.");
        }
        return ownHouseholdId;
    }

    private User currentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Current user not found: " + username));
    }
}
