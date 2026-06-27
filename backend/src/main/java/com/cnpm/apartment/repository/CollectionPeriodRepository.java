package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.CollectionPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CollectionPeriodRepository extends JpaRepository<CollectionPeriod, String> {
    boolean existsByNameIgnoreCase(String name);
}
