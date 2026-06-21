package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.StatisticsDTO;
import com.cnpm.apartment.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StatisticsController {

    private final StatisticsService statisticsService;

    /**
     * GET /api/statistics/overview
     * Tổng quan: tổng tiền thu, số hộ đã/chưa nộp, tỷ lệ hoàn thành.
     */
    @GetMapping("/overview")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<ApiResponse<StatisticsDTO>> getOverview() {
        StatisticsDTO dto = statisticsService.getOverview();
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    /**
     * GET /api/statistics/by-period/{periodId}
     * Thống kê theo một đợt thu cụ thể.
     */
    @GetMapping("/by-period/{periodId}")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<ApiResponse<StatisticsDTO>> getByPeriod(
            @PathVariable String periodId) {
        StatisticsDTO dto = statisticsService.getByPeriod(periodId);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    /**
     * GET /api/statistics/monthly?year=2025
     * Thống kê doanh thu theo tháng trong năm (dùng cho biểu đồ Bar/Line).
     */
    @GetMapping("/monthly")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<ApiResponse<StatisticsDTO>> getMonthly(
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}") int year) {
        StatisticsDTO dto = statisticsService.getMonthlyRevenue(year);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    /**
     * GET /api/statistics/by-fee-type
     * Thống kê doanh thu theo loại phí (dùng cho biểu đồ Pie).
     */
    @GetMapping("/by-fee-type")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<ApiResponse<StatisticsDTO>> getByFeeType() {
        StatisticsDTO dto = statisticsService.getRevenueByFeeType();
        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}
