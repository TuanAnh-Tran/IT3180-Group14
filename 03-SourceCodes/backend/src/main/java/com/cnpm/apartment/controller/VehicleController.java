package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.VehicleDTO;
import com.cnpm.apartment.dto.VehicleSaveDTO;
import com.cnpm.apartment.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VehicleController {

    private final VehicleService vehicleService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<VehicleDTO>> saveVehicle(@Valid @RequestBody VehicleSaveDTO request) {
        VehicleDTO saved = vehicleService.saveVehicle(request);
        return ResponseEntity.ok(ApiResponse.success("Lưu thông tin xe thành công", saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> deleteVehicle(@PathVariable String id) {
        vehicleService.deleteVehicle(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa đăng ký xe thành công", null));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Page<VehicleDTO>>> searchVehicles(
            @RequestParam(required = false) String plateNumber,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String householdId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("plateNumber"));
        Page<VehicleDTO> result = vehicleService.searchVehicles(plateNumber, type, householdId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/household/{householdId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<List<VehicleDTO>>> getVehiclesByHousehold(@PathVariable String householdId) {
        List<VehicleDTO> list = vehicleService.getVehiclesByHousehold(householdId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
