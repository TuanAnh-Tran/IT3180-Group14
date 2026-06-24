package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.UtilityRecordHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UtilityRecordHistoryRepository extends JpaRepository<UtilityRecordHistory, String> {
    List<UtilityRecordHistory> findAllByOrderByModifiedAtDesc();
}
