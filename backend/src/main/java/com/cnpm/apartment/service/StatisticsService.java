package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.OverviewProjection;
import com.cnpm.apartment.dto.StatisticsDTO;
import com.cnpm.apartment.model.enums.FeeStatus;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.HouseholdRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final AssignedFeeRepository assignedFeeRepository;
    private final HouseholdRepository householdRepository;
    private final com.cnpm.apartment.service.calculator.CalculatorFactory calculatorFactory;

    // =========================================================
    // THỐNG KÊ TỔNG QUAN
    // =========================================================

    @Transactional(readOnly = true)
    public StatisticsDTO getOverview() {
        long totalHouseholds = householdRepository.count();

        // Single DB call using optimized query projection
        OverviewProjection stats = assignedFeeRepository.getOverviewStatistics();

        long paidCount = 0;
        long unpaidCount = 0;
        long partialCount = 0;
        BigDecimal totalCollected = stats.getTotalCollected() != null
                ? stats.getTotalCollected()
                : BigDecimal.ZERO;

        long totalAssignments = 0;
        BigDecimal totalPending = BigDecimal.ZERO;
        List<com.cnpm.apartment.model.AssignedFee> assignedFees = assignedFeeRepository.findAll();
        for (com.cnpm.apartment.model.AssignedFee af : assignedFees) {
            BigDecimal required = calculateAmount(af);
            BigDecimal paid = af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO;
            BigDecimal debt = required.subtract(paid);
            if (required.compareTo(BigDecimal.ZERO) > 0) {
                totalAssignments++;
                if (af.getStatus() == FeeStatus.PAID || paid.compareTo(required) >= 0) {
                    paidCount++;
                } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
                    partialCount++;
                } else {
                    unpaidCount++;
                }
            }
            if (debt.compareTo(BigDecimal.ZERO) > 0) {
                totalPending = totalPending.add(debt);
            }
        }
        double completionRate = (totalAssignments == 0) ? 0.0
                : (double) paidCount / totalAssignments * 100;

        return StatisticsDTO.builder()
                .totalCollected(totalCollected)
                .totalPending(totalPending)
                .totalHouseholds(totalHouseholds)
                .paidHouseholds(paidCount)
                .unpaidHouseholds(unpaidCount + partialCount)
                .completionRate(Math.round(completionRate * 100.0) / 100.0)
                .build();
    }

    private long valueOrZero(Long value) {
        return value != null ? value : 0L;
    }

    private BigDecimal calculateAmount(com.cnpm.apartment.model.AssignedFee af) {
        return calculatorFactory.getCalculator(af.getFee().getCalcMethod()).calculate(af);
    }

    @Transactional(readOnly = true)
    public List<com.cnpm.apartment.dto.ContributionDTO> getVoluntaryContributions() {
        return assignedFeeRepository.findVoluntaryContributions().stream()
                .map(af -> com.cnpm.apartment.dto.ContributionDTO.builder()
                        .householdId(af.getHousehold().getId())
                        .ownerName(af.getHousehold().getOwnerName())
                        .feeName(af.getFee().getName())
                        .amountPaid(af.getAmountPaidAccumulated())
                        .paidAt(af.getPaidAt())
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }

    // =========================================================
    // THỐNG KÊ THEO ĐỢT THU
    // =========================================================

    public StatisticsDTO getByPeriod(String periodId) {
        long paidCount = 0;
        long unpaidCount = 0;
        long partialCount = 0;
        BigDecimal totalCollected = assignedFeeRepository.sumAmountByPeriodId(periodId);

        long totalAssigned = 0;
        for (com.cnpm.apartment.model.AssignedFee af : assignedFeeRepository.findByPeriodId(periodId, Pageable.unpaged()).getContent()) {
            BigDecimal required = calculateAmount(af);
            BigDecimal paid = af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO;
            if (required.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            totalAssigned++;
            if (af.getStatus() == FeeStatus.PAID || paid.compareTo(required) >= 0) {
                paidCount++;
            } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
                partialCount++;
            } else {
                unpaidCount++;
            }
        }
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
