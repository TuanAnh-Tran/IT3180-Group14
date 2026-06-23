package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.TemporaryResidenceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TemporaryResidenceRecordRepository extends JpaRepository<TemporaryResidenceRecord, String> {
    List<TemporaryResidenceRecord> findByResidentIdOrderByCreatedAtDesc(String residentId);

    @Query("SELECT MONTH(tr.createdAt) as month, COUNT(tr) FROM TemporaryResidenceRecord tr WHERE YEAR(tr.createdAt) = :year GROUP BY MONTH(tr.createdAt)")
    List<Object[]> countRecordsByMonth(@Param("year") int year);
}
