package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.VehicleDTO;
import com.cnpm.apartment.dto.VehicleSaveDTO;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Vehicle;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final HouseholdRepository householdRepository;

    @Transactional
    public VehicleDTO saveVehicle(VehicleSaveDTO request) {
        // 1. Kiểm tra trùng biển số xe
        boolean exists;
        if (request.getId() != null && !request.getId().trim().isEmpty()) {
            exists = vehicleRepository.existsByPlateNumberAndIdNot(request.getPlateNumber(), request.getId());
        } else {
            exists = vehicleRepository.existsByPlateNumber(request.getPlateNumber());
        }
        if (exists) {
            throw new IllegalArgumentException("Biển số xe \"" + request.getPlateNumber() + "\" đã được đăng ký trong hệ thống.");
        }

        // 2. Tìm hộ gia đình mới
        Household household = householdRepository.findById(request.getHouseholdId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hộ gia đình với ID: " + request.getHouseholdId()));

        String oldHouseholdId = null;
        Vehicle vehicle;

        if (request.getId() != null && !request.getId().trim().isEmpty()) {
            vehicle = vehicleRepository.findById(request.getId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy xe với ID: " + request.getId()));
            oldHouseholdId = vehicle.getHousehold().getId();

            vehicle.setPlateNumber(request.getPlateNumber());
            vehicle.setType(request.getType().toUpperCase());
            vehicle.setOwnerName(request.getOwnerName());
            vehicle.setRegistrationDate(request.getRegistrationDate());
            vehicle.setHousehold(household);
        } else {
            vehicle = Vehicle.builder()
                    .id(UUID.randomUUID().toString())
                    .plateNumber(request.getPlateNumber())
                    .type(request.getType().toUpperCase())
                    .ownerName(request.getOwnerName())
                    .registrationDate(request.getRegistrationDate())
                    .household(household)
                    .build();
        }

        Vehicle saved = vehicleRepository.save(vehicle);

        // 3. Đồng bộ lại số lượng xe trên hộ dân (Hộ mới và Hộ cũ nếu có đổi hộ)
        syncHouseholdVehicleCounts(household.getId());
        if (oldHouseholdId != null && !oldHouseholdId.equals(household.getId())) {
            syncHouseholdVehicleCounts(oldHouseholdId);
        }

        return mapToDTO(saved);
    }

    @Transactional
    public void deleteVehicle(String id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xe với ID: " + id));
        String householdId = vehicle.getHousehold().getId();

        vehicleRepository.delete(vehicle);

        // Đồng bộ lại số lượng xe trên hộ dân sau khi xóa
        syncHouseholdVehicleCounts(householdId);
    }

    @Transactional(readOnly = true)
    public Page<VehicleDTO> searchVehicles(String plateNumber, String type, String householdId, Pageable pageable) {
        String filterPlate = plateNumber != null ? plateNumber.trim() : "";
        String filterType = type != null ? type.trim() : "";
        String filterHh = householdId != null ? householdId.trim() : "";

        return vehicleRepository.findByPlateNumberContainingIgnoreCaseAndTypeContainingIgnoreCaseAndHouseholdIdContainingIgnoreCase(
                filterPlate, filterType, filterHh, pageable
        ).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<VehicleDTO> getVehiclesByHousehold(String householdId) {
        return vehicleRepository.findByHouseholdId(householdId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private void syncHouseholdVehicleCounts(String householdId) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hộ gia đình để đồng bộ số xe. ID: " + householdId));
        int motorcycleCount = (int) vehicleRepository.countByHouseholdIdAndType(householdId, "MOTORCYCLE");
        int carCount = (int) vehicleRepository.countByHouseholdIdAndType(householdId, "CAR");

        household.setMotorcycleCount(motorcycleCount);
        household.setCarCount(carCount);
        householdRepository.save(household);
        log.info("Đã đồng bộ số lượng xe cho hộ {}: {} xe máy, {} ô tô", householdId, motorcycleCount, carCount);
    }

    private VehicleDTO mapToDTO(Vehicle v) {
        return VehicleDTO.builder()
                .id(v.getId())
                .plateNumber(v.getPlateNumber())
                .type(v.getType())
                .ownerName(v.getOwnerName())
                .registrationDate(v.getRegistrationDate())
                .householdId(v.getHousehold().getId())
                .apartmentNo(v.getHousehold().getId().startsWith("HH-") ? v.getHousehold().getId().substring(3) : v.getHousehold().getId())
                .build();
    }
}
