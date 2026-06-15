package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.ResidentActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResidentActivityLogRepository extends JpaRepository<ResidentActivityLog, String> {
    List<ResidentActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
