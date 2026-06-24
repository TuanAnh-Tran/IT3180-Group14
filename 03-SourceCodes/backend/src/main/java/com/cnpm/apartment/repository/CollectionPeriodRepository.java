package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.CollectionPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CollectionPeriodRepository extends JpaRepository<CollectionPeriod, String> {
    Optional<CollectionPeriod> findFirstByOrderByCreatedAtDesc();
}

