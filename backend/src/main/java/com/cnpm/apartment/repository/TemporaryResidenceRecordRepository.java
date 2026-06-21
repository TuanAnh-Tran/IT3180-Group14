package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.TemporaryResidenceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TemporaryResidenceRecordRepository extends JpaRepository<TemporaryResidenceRecord, String> {
    List<TemporaryResidenceRecord> findByResidentIdOrderByCreatedAtDesc(String residentId);
}
