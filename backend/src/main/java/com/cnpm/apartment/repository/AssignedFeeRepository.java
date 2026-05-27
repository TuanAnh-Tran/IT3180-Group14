package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.enums.FeeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignedFeeRepository extends JpaRepository<AssignedFee, String> {

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

    // Đếm số phí đã nộp / chưa nộp theo đợt
    long countByPeriodIdAndStatus(String periodId, FeeStatus status);

    // Đếm toàn bộ (không lọc đợt) - dùng cho overview
    long countByStatus(FeeStatus status);

    // Tổng tiền thu được theo đợt (chỉ PAID)
    @Query("SELECT COALESCE(SUM(af.fee.price * af.quantity), 0) FROM AssignedFee af " +
           "WHERE af.period.id = :periodId AND af.status = 'PAID'")
    double sumAmountByPeriodId(@Param("periodId") String periodId);

    // Tổng tiền thu được toàn bộ
    @Query("SELECT COALESCE(SUM(af.fee.price * af.quantity), 0) FROM AssignedFee af " +
           "WHERE af.status = 'PAID'")
    double sumTotalAmountPaid();

    // Thống kê theo tháng trong năm
    @Query("SELECT MONTH(af.paidAt) as month, COALESCE(SUM(af.fee.price * af.quantity), 0) as total " +
           "FROM AssignedFee af WHERE af.status = 'PAID' AND YEAR(af.paidAt) = :year " +
           "GROUP BY MONTH(af.paidAt) ORDER BY MONTH(af.paidAt)")
    List<Object[]> sumAmountByMonth(@Param("year") int year);

    // Thống kê theo loại phí
    @Query("SELECT af.fee.type, COALESCE(SUM(af.fee.price * af.quantity), 0) " +
           "FROM AssignedFee af WHERE af.status = 'PAID' GROUP BY af.fee.type")
    List<Object[]> sumAmountByFeeType();
}
