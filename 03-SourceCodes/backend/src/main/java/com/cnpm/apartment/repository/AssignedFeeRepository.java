package com.cnpm.apartment.repository;

import com.cnpm.apartment.dto.OverviewProjection;
import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.enums.FeeStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssignedFeeRepository extends JpaRepository<AssignedFee, String> {

    // Pessimistic Write Lock for payment updates
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT af FROM AssignedFee af WHERE af.id = :id")
    Optional<AssignedFee> findByIdForUpdate(@Param("id") String id);

    // Lấy danh sách phí theo trạng thái (UNPAID/PAID)
    Page<AssignedFee> findByStatus(FeeStatus status, Pageable pageable);

    // Lấy danh sách phí theo đợt thu
    Page<AssignedFee> findByPeriodId(String periodId, Pageable pageable);

    // Lấy danh sách phí theo hộ
    Page<AssignedFee> findByHouseholdId(String householdId, Pageable pageable);

    // Lấy danh sách phí theo đợt thu VÀ trạng thái
    Page<AssignedFee> findByPeriodIdAndStatus(String periodId, FeeStatus status, Pageable pageable);

    // Lấy danh sách phí chưa nộp của 1 hộ
    List<AssignedFee> findByHouseholdIdAndStatus(String householdId, FeeStatus status);

    // Lấy danh sách phí theo đợt thu + hộ + trạng thái
    Page<AssignedFee> findByPeriodIdAndHouseholdIdAndStatus(
            String periodId, String householdId, FeeStatus status, Pageable pageable);

    List<AssignedFee> findByHouseholdIdAndStatusIn(String householdId, Collection<FeeStatus> statuses);

    // Đếm số phí đã nộp / chưa nộp theo đợt
    long countByPeriodIdAndStatus(String periodId, FeeStatus status);

    // Đếm toàn bộ (không lọc đợt) - dùng cho overview
    long countByStatus(FeeStatus status);

    // Tổng tiền thu được theo đợt
    @Query("SELECT COALESCE(SUM(af.amountPaidAccumulated), 0) FROM AssignedFee af " +
           "WHERE af.period.id = :periodId")
    BigDecimal sumAmountByPeriodId(@Param("periodId") String periodId);

    // Tổng tiền thu được toàn bộ
    @Query("SELECT COALESCE(SUM(af.amountPaidAccumulated), 0) FROM AssignedFee af")
    BigDecimal sumTotalAmountPaid();

    // Thống kê theo tháng trong năm
    @Query("SELECT MONTH(af.paidAt) as month, COALESCE(SUM(af.amountPaidAccumulated), 0) as total " +
           "FROM AssignedFee af WHERE YEAR(af.paidAt) = :year " +
           "GROUP BY MONTH(af.paidAt) ORDER BY MONTH(af.paidAt)")
    List<Object[]> sumAmountByMonth(@Param("year") int year);

    // Thống kê theo loại phí
    @Query("SELECT af.fee.type, COALESCE(SUM(af.amountPaidAccumulated), 0) " +
           "FROM AssignedFee af GROUP BY af.fee.type")
    List<Object[]> sumAmountByFeeType();

    // Optimized overview query returning native projection DTO
    @Query(value = "SELECT " +
           "    COUNT(af.id) as totalAssignments, " +
           "    SUM(CASE WHEN af.status = 'PAID' THEN 1 ELSE 0 END) as paidCount, " +
           "    SUM(CASE WHEN af.status = 'UNPAID' THEN 1 ELSE 0 END) as unpaidCount, " +
           "    SUM(CASE WHEN af.status = 'PARTIAL' THEN 1 ELSE 0 END) as partialCount, " +
           "    COALESCE(SUM(af.amount_paid_accumulated), 0) as totalCollected " +
           "FROM assigned_fee af", nativeQuery = true)
    OverviewProjection getOverviewStatistics();
}

