package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.Vehicle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, String> {
    
    List<Vehicle> findByHouseholdId(String householdId);

    long countByHouseholdIdAndType(String householdId, String type);

    boolean existsByPlateNumber(String plateNumber);

    boolean existsByPlateNumberAndIdNot(String plateNumber, String id);

    Page<Vehicle> findByPlateNumberContainingIgnoreCaseAndTypeContainingIgnoreCaseAndHouseholdIdContainingIgnoreCase(
            String plateNumber, String type, String householdId, Pageable pageable);
}
