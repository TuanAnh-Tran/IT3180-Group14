package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.ReceiptDTO;
import com.cnpm.apartment.service.ReceiptService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/receipts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReceiptController {

    private final ReceiptService receiptService;

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
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<Page<ReceiptDTO>>> getHistory(
            @RequestParam(required = false) String householdId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "paidAt"));
        Page<ReceiptDTO> result = receiptService.getHistory(householdId, from, to, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * GET /api/receipts/{id}
     * Lấy chi tiết một biên lai cụ thể.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<ReceiptDTO>> getById(@PathVariable String id) {
        ReceiptDTO dto = receiptService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}
