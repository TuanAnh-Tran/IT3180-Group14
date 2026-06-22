package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.FeeDTO;
import com.cnpm.apartment.dto.FeeSaveDTO;
import com.cnpm.apartment.service.FeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller xử lý các REST API liên quan đến khoản phí.
 */
@RestController
@RequestMapping("/api/fees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FeeController {

    private final FeeService feeService;

    /**
     * Lấy toàn bộ danh sách khoản phí.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<List<FeeDTO>>> getAllFees() {
        List<FeeDTO> list = feeService.getAllFees();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách khoản phí thành công", list));
    }

    /**
     * Lấy thông tin chi tiết một khoản phí theo ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<FeeDTO>> getFeeById(@PathVariable String id) {
        FeeDTO fee = feeService.getFeeById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin khoản phí thành công", fee));
    }

    /**
     * Lưu thông tin khoản phí (Thêm mới hoặc Cập nhật).
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<FeeDTO>> saveFee(@Valid @RequestBody FeeSaveDTO request) {
        FeeDTO saved = feeService.saveFee(request);
        return ResponseEntity.ok(ApiResponse.success("Lưu thông tin khoản phí thành công", saved));
    }

    /**
     * Xóa khoản phí theo ID.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> deleteFee(@PathVariable String id) {
        feeService.deleteFee(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa khoản phí thành công", null));
    }
}
