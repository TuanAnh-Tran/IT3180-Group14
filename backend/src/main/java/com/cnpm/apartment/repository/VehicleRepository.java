package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, String> {
    Optional<Vehicle> findByPlateNumberIgnoreCase(String plateNumber);

    List<Vehicle> findByHouseholdId(String householdId);
}
