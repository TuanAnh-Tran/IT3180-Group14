package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.Household;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HouseholdRepository extends JpaRepository<Household, String> {
}
