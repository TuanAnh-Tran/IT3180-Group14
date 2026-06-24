package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.PeriodDTO;
import com.cnpm.apartment.dto.PeriodSaveDTO;
import com.cnpm.apartment.model.CollectionPeriod;
import com.cnpm.apartment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller xử lý các REST API liên quan đến Đợt thu phí (CollectionPeriod).
 */
@RestController
@RequestMapping("/api/payments/periods")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PeriodController {

    private final PaymentService paymentService;

    /**
     * Lấy toàn bộ danh sách đợt thu phí.
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<List<PeriodDTO>>> getAllPeriods() {
        List<PeriodDTO> list = paymentService.getAllPeriods();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đợt thu phí thành công", list));
    }

    /**
     * Lấy chi tiết đợt thu phí theo ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<PeriodDTO>> getPeriodById(@PathVariable String id) {
        PeriodDTO dto = paymentService.getPeriodById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đợt thu phí thành công", dto));
    }

    /**
     * Tạo mới một đợt thu phí và tự động gán các khoản phí tương ứng cho các hộ dân.
     */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<ApiResponse<PeriodDTO>> createPeriod(@Valid @RequestBody PeriodSaveDTO request) {
        // Tự sinh ID cho đợt thu định dạng PER_XXXXXXXX
        String uniqueId = "PER_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        CollectionPeriod created = paymentService.createPeriod(uniqueId, request.getName(), request.getDueDate(), request.getFeeIds());
        PeriodDTO dto = paymentService.mapToPeriodDTO(created);
        return ResponseEntity.ok(ApiResponse.success("Tạo đợt thu phí thành công", dto));
    }

    /**
     * Đóng đợt thu phí.
     */
    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<ApiResponse<PeriodDTO>> closePeriod(@PathVariable String id) {
        PeriodDTO dto = paymentService.closePeriod(id);
        return ResponseEntity.ok(ApiResponse.success("Đóng đợt thu phí thành công", dto));
    }

    /**
     * Mở lại đợt thu phí đã đóng.
     */
    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<ApiResponse<PeriodDTO>> reopenPeriod(@PathVariable String id) {
        PeriodDTO dto = paymentService.reopenPeriod(id);
        return ResponseEntity.ok(ApiResponse.success("Mở lại đợt thu phí thành công", dto));
    }
}

