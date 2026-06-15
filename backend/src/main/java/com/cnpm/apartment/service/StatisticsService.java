package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.StatisticsDTO;
import com.cnpm.apartment.model.enums.FeeStatus;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.HouseholdRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final AssignedFeeRepository assignedFeeRepository;
    private final HouseholdRepository householdRepository;

    // =========================================================
    // THỐNG KÊ TỔNG QUAN
    // =========================================================

    public StatisticsDTO getOverview() {
        long totalHouseholds = householdRepository.count();
        double totalCollected = assignedFeeRepository.sumTotalAmountPaid();

        // Đếm toàn bộ phí đã nộp / chưa nộp (không lọc theo đợt)
        long paidCount   = assignedFeeRepository.countByStatus(FeeStatus.PAID);
        long unpaidCount = assignedFeeRepository.countByStatus(FeeStatus.UNPAID);

        double completionRate = (paidCount + unpaidCount == 0) ? 0.0
                : (double) paidCount / (paidCount + unpaidCount) * 100;

        return StatisticsDTO.builder()
                .totalCollected(totalCollected)
                .totalHouseholds(totalHouseholds)
                .paidHouseholds(paidCount)
                .unpaidHouseholds(unpaidCount)
                .completionRate(Math.round(completionRate * 100.0) / 100.0)
                .build();
    }

    // =========================================================
    // THỐNG KÊ THEO ĐỢT THU
    // =========================================================

    public StatisticsDTO getByPeriod(String periodId) {
        long paidCount   = assignedFeeRepository.countByPeriodIdAndStatus(periodId, FeeStatus.PAID);
        long unpaidCount = assignedFeeRepository.countByPeriodIdAndStatus(periodId, FeeStatus.UNPAID);
        double totalCollected = assignedFeeRepository.sumAmountByPeriodId(periodId);

        double completionRate = (paidCount + unpaidCount == 0) ? 0.0
                : (double) paidCount / (paidCount + unpaidCount) * 100;

        return StatisticsDTO.builder()
                .periodId(periodId)
                .totalCollected(totalCollected)
                .paidCount(paidCount)
                .unpaidCount(unpaidCount)
                .totalAssigned(paidCount + unpaidCount)
                .completionRate(Math.round(completionRate * 100.0) / 100.0)
                .build();
    }

    // =========================================================
    // THỐNG KÊ THEO THÁNG (Biểu đồ Bar / Line)
    // =========================================================

    public StatisticsDTO getMonthlyRevenue(int year) {
        List<Object[]> rows = assignedFeeRepository.sumAmountByMonth(year);

        // Khởi tạo 12 tháng = 0
        Map<String, Double> monthly = new HashMap<>();
        for (int m = 1; m <= 12; m++) {
            monthly.put("Tháng " + m, 0.0);
        }

        // Điền dữ liệu từ DB
        for (Object[] row : rows) {
            int month = ((Number) row[0]).intValue();
            double total = ((Number) row[1]).doubleValue();
            monthly.put("Tháng " + month, total);
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

        Map<String, Double> byType = new HashMap<>();
        for (Object[] row : rows) {
            String type = row[0].toString();
            double total = ((Number) row[1]).doubleValue();
            byType.put(type, total);
        }

        return StatisticsDTO.builder()
                .revenueByFeeType(byType)
                .build();
    }
}
