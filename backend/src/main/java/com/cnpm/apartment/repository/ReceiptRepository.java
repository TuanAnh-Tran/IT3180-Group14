package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.Receipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, String> {

    Optional<Receipt> findByIdempotencyKey(String idempotencyKey);

    // Lịch sử đóng phí của một hộ
    Page<Receipt> findByAssignedFeeHouseholdId(String householdId, Pageable pageable);

    // Lịch sử theo đợt thu
    Page<Receipt> findByAssignedFeePeriodId(String periodId, Pageable pageable);

    // Lịch sử theo khoảng thời gian
    Page<Receipt> findByPaidAtBetween(LocalDateTime from, LocalDateTime to, Pageable pageable);

    // Lịch sử của 1 hộ trong khoảng thời gian
    Page<Receipt> findByAssignedFeeHouseholdIdAndPaidAtBetween(
            String householdId, LocalDateTime from, LocalDateTime to, Pageable pageable);

    // Biên lai theo assignedFeeId
    List<Receipt> findByAssignedFeeId(String assignedFeeId);

    // Lịch sử của 1 hộ trong 1 đợt thu
    @Query("SELECT r FROM Receipt r WHERE r.assignedFee.household.id = :householdId " +
           "AND r.assignedFee.period.id = :periodId")
    List<Receipt> findByHouseholdIdAndPeriodId(
            @Param("householdId") String householdId,
            @Param("periodId") String periodId);

    // Xuất báo cáo theo đợt (không phân trang)
    @Query("SELECT r FROM Receipt r WHERE r.assignedFee.period.id = :periodId " +
           "ORDER BY r.paidAt DESC")
    List<Receipt> findAllByPeriodIdForExport(@Param("periodId") String periodId);

    // Xuất báo cáo theo khoảng thời gian (không phân trang)
    @Query("SELECT r FROM Receipt r WHERE r.paidAt BETWEEN :from AND :to ORDER BY r.paidAt DESC")
    List<Receipt> findAllByDateRangeForExport(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
