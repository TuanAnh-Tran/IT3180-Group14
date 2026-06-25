package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.UtilityRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UtilityRecordRepository extends JpaRepository<UtilityRecord, String> {
    Optional<UtilityRecord> findByHouseholdIdAndPeriodIdAndType(String householdId, String periodId, String type);

    @Query("SELECT ur FROM UtilityRecord ur JOIN FETCH ur.household JOIN FETCH ur.period ORDER BY ur.id DESC")
    List<UtilityRecord> findAllWithDetails();
}
