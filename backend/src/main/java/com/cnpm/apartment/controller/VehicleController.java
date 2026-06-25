package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Vehicle;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VehicleController {

    private final VehicleRepository vehicleRepository;
    private final HouseholdRepository householdRepository;

    public record VehicleDTO(
            String id,
            String plateNumber,
            String type,
            String ownerName,
            LocalDate registrationDate,
            String householdId,
            String apartmentNo) {}

    public record VehicleRequest(
            String id,
            String plateNumber,
            String type,
            String ownerName,
            LocalDate registrationDate,
            String householdId) {}

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Page<VehicleDTO>>> searchVehicles(
            @RequestParam(required = false) String plateNumber,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String householdId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        List<VehicleDTO> filtered = vehicleRepository.findAll(Sort.by("plateNumber")).stream()
                .filter(vehicle -> matches(vehicle, plateNumber, type, householdId))
                .map(this::mapVehicle)
                .toList();

        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        int from = Math.min(safePage * safeSize, filtered.size());
        int to = Math.min(from + safeSize, filtered.size());
        Page<VehicleDTO> result = new PageImpl<>(
                filtered.subList(from, to),
                PageRequest.of(safePage, safeSize),
                filtered.size());

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/household/{householdId}")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<VehicleDTO>>> getByHousehold(@PathVariable String householdId) {
        List<VehicleDTO> result = vehicleRepository.findByHouseholdId(householdId).stream()
                .map(this::mapVehicle)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<VehicleDTO>> saveVehicle(@RequestBody VehicleRequest request) {
        String plateNumber = normalizePlate(request.plateNumber());
        if (plateNumber.isBlank()) {
            throw new RuntimeException("Vehicle plate number is required.");
        }

        String id = request.id() == null || request.id().isBlank()
                ? "VEH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()
                : request.id().trim();

        vehicleRepository.findByPlateNumberIgnoreCase(plateNumber).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new RuntimeException("Vehicle plate number is already registered.");
            }
        });

        Household household = householdRepository.findById(request.householdId())
                .orElseThrow(() -> new RuntimeException("Household not found: " + request.householdId()));

        Vehicle vehicle = vehicleRepository.findById(id).orElseGet(Vehicle::new);
        vehicle.setId(id);
        vehicle.setPlateNumber(plateNumber);
        vehicle.setType(normalizeType(request.type()));
        vehicle.setOwnerName(request.ownerName() == null || request.ownerName().isBlank()
                ? household.getOwnerName()
                : request.ownerName().trim());
        vehicle.setRegistrationDate(request.registrationDate() != null ? request.registrationDate() : LocalDate.now());
        vehicle.setHousehold(household);

        return ResponseEntity.ok(ApiResponse.success("Vehicle saved successfully", mapVehicle(vehicleRepository.save(vehicle))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> deleteVehicle(@PathVariable String id) {
        if (!vehicleRepository.existsById(id)) {
            throw new RuntimeException("Vehicle not found: " + id);
        }
        vehicleRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Vehicle deleted successfully", null));
    }

    private boolean matches(Vehicle vehicle, String plateNumber, String type, String householdId) {
        String plateFilter = normalize(plateNumber);
        String typeFilter = normalize(type);
        String householdFilter = normalize(householdId);

        boolean plateOk = plateFilter.isBlank() || normalize(vehicle.getPlateNumber()).contains(plateFilter);
        boolean typeOk = typeFilter.isBlank() || "ALL".equals(typeFilter) || normalize(vehicle.getType()).equals(typeFilter);
        boolean householdOk = householdFilter.isBlank() || normalize(vehicle.getHousehold().getId()).equals(householdFilter);
        return plateOk && typeOk && householdOk;
    }

    private VehicleDTO mapVehicle(Vehicle vehicle) {
        Household household = vehicle.getHousehold();
        return new VehicleDTO(
                vehicle.getId(),
                vehicle.getPlateNumber(),
                vehicle.getType(),
                vehicle.getOwnerName(),
                vehicle.getRegistrationDate(),
                household.getId(),
                household.getApartmentNo());
    }

    private String normalizePlate(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeType(String value) {
        String normalized = normalize(value);
        return normalized.isBlank() ? "MOTORCYCLE" : normalized;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }
}
