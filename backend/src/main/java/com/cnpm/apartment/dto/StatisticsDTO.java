package com.cnpm.apartment.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Response cho trang Thống kê.
 */
@Data
@Builder
public class StatisticsDTO {

    // === Tổng quan ===
    private java.math.BigDecimal totalCollected;       // Tổng tiền đã thu
    private java.math.BigDecimal totalPending;         // Tổng tiền chưa thu
    private long totalHouseholds;        // Tổng số hộ
    private long paidHouseholds;         // Số hộ đã nộp đủ
    private long unpaidHouseholds;       // Số hộ chưa nộp
    private double completionRate;       // Tỷ lệ hoàn thành (%)

    // === Theo đợt thu ===
    private String periodId;
    private String periodName;
    private long totalAssigned;          // Tổng số khoản phí trong đợt
    private long paidCount;             // Số đã nộp
    private long unpaidCount;           // Số chưa nộp

    // === Theo tháng (cho biểu đồ line/bar) ===
    // Key: "1" → "12" (tháng), Value: tổng tiền
    private Map<String, java.math.BigDecimal> monthlyRevenue;

    // === Theo loại phí (cho biểu đồ pie) ===
    // Key: FeeType, Value: tổng tiền
    private Map<String, java.math.BigDecimal> revenueByFeeType;

    // === Top hộ nợ nhiều nhất ===
    private List<DebtSummaryDTO> topDebtors;

    @Data
    @Builder
    public static class DebtSummaryDTO {
        private String householdId;
        private String ownerName;
        private java.math.BigDecimal totalDebt;
        private long unpaidCount;
    }
}
