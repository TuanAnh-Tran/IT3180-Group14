package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.UtilityRecordUpdateDTO;
import com.cnpm.apartment.dto.UtilityRecordHistoryDTO;
import com.cnpm.apartment.service.UtilityRecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/utility-records")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UtilityRecordController {

    private final UtilityRecordService utilityRecordService;

    @PostMapping("/update")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<ApiResponse<Void>> updateUtilityRecord(
            @Valid @RequestBody UtilityRecordUpdateDTO request) {
        utilityRecordService.updateUtilityRecord(request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chỉ số tiêu thụ và ghi lịch sử thành công", null));
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<ApiResponse<List<UtilityRecordHistoryDTO>>> getUtilityHistory() {
        List<UtilityRecordHistoryDTO> history = utilityRecordService.getUtilityHistory();
        return ResponseEntity.ok(ApiResponse.success(history));
    }
}

