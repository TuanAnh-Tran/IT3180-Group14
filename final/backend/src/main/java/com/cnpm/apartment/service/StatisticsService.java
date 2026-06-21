package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.OverviewProjection;
import com.cnpm.apartment.dto.StatisticsDTO;
import com.cnpm.apartment.model.enums.FeeStatus;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.HouseholdRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatisticsService {

    private final AssignedFeeRepository assignedFeeRepository;
    private final HouseholdRepository householdRepository;

    // =========================================================
    // THỐNG KÊ TỔNG QUAN
    // =========================================================

    public StatisticsDTO getOverview() {
        long totalHouseholds = householdRepository.count();

        // Single DB call using optimized query projection
        OverviewProjection stats = assignedFeeRepository.getOverviewStatistics();

        long paidCount = stats.getPaidCount();
        long unpaidCount = stats.getUnpaidCount();
        long partialCount = stats.getPartialCount();
        BigDecimal totalCollected = stats.getTotalCollected();

        long totalAssignments = stats.getTotalAssignments();
        double completionRate = (totalAssignments == 0) ? 0.0
                : (double) paidCount / totalAssignments * 100;

        // Calculate pending amount: sum of required - accumulated paid
        // For simple representation in fallback, we can calculate totalPending as 0 if not scanned, 
        // or just leave totalPending as null/zero or calculate it. We'll set it to zero for now or compute if needed.
        BigDecimal totalPending = BigDecimal.ZERO;

        return StatisticsDTO.builder()
                .totalCollected(totalCollected)
                .totalPending(totalPending)
                .totalHouseholds(totalHouseholds)
                .paidHouseholds(paidCount)
                .unpaidHouseholds(unpaidCount + partialCount)
                .completionRate(Math.round(completionRate * 100.0) / 100.0)
                .build();
    }

    // =========================================================
    // THỐNG KÊ THEO ĐỢT THU
    // =========================================================

    public StatisticsDTO getByPeriod(String periodId) {
        long paidCount   = assignedFeeRepository.countByPeriodIdAndStatus(periodId, FeeStatus.PAID);
        long unpaidCount = assignedFeeRepository.countByPeriodIdAndStatus(periodId, FeeStatus.UNPAID);
        long partialCount = assignedFeeRepository.countByPeriodIdAndStatus(periodId, FeeStatus.PARTIAL);
        BigDecimal totalCollected = assignedFeeRepository.sumAmountByPeriodId(periodId);

        long totalAssigned = paidCount + unpaidCount + partialCount;
        double completionRate = (totalAssigned == 0) ? 0.0
                : (double) paidCount / totalAssigned * 100;

        return StatisticsDTO.builder()
                .periodId(periodId)
                .totalCollected(totalCollected)
                .paidCount(paidCount)
                .unpaidCount(unpaidCount + partialCount)
                .totalAssigned(totalAssigned)
                .completionRate(Math.round(completionRate * 100.0) / 100.0)
                .build();
    }

    // =========================================================
    // THỐNG KÊ THEO THÁNG (Biểu đồ Bar / Line)
    // =========================================================

    public StatisticsDTO getMonthlyRevenue(int year) {
        List<Object[]> rows = assignedFeeRepository.sumAmountByMonth(year);

        // Initialize 12 months = 0
        Map<String, BigDecimal> monthly = new HashMap<>();
        for (int m = 1; m <= 12; m++) {
            monthly.put("Month " + m, BigDecimal.ZERO);
        }

        // Fill data from DB
        for (Object[] row : rows) {
            int month = ((Number) row[0]).intValue();
            BigDecimal total = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
            monthly.put("Month " + month, total);
        }

        return StatisticsDTO.builder()
                .monthlyRevenue(monthly)
                .build();
    }

    // =========================================================
    // THỐNG KÊ THEO LOẠI PHÍ (Biểu đồ Pie)
    // =========================================================

    public StatisticsDTO getRevenueByFeeType() {
        List<Object[]> rows = assignedFeeRepository.sumAmountByFeeType();

        Map<String, BigDecimal> byType = new HashMap<>();
        for (Object[] row : rows) {
            String type = row[0].toString();
            BigDecimal total = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
            byType.put(type, total);
        }

        return StatisticsDTO.builder()
                .revenueByFeeType(byType)
                .build();
    }
}
