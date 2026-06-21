package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.model.Fee;
import com.cnpm.apartment.repository.FeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FeeController {

    private final FeeRepository feeRepository;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<List<Fee>>> getFees() {
        return ResponseEntity.ok(ApiResponse.success(feeRepository.findAll()));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Fee>> createFee(@RequestBody Fee fee) {
        if (fee.getId() == null || fee.getId().isEmpty()) {
            fee.setId("FEE-" + System.currentTimeMillis());
        }
        return ResponseEntity.ok(ApiResponse.success(feeRepository.save(fee)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Fee>> updateFee(@PathVariable String id, @RequestBody Fee fee) {
        fee.setId(id);
        return ResponseEntity.ok(ApiResponse.success(feeRepository.save(fee)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Void>> deleteFee(@PathVariable String id) {
        feeRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
