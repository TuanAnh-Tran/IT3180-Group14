package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.model.ActivityLog;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Resident;
import com.cnpm.apartment.service.ResidentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/residents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ResidentController {

    private final ResidentService residentService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        Map<String, Object> stats = residentService.loadStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/households")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<Page<Household>>> searchHouseholds(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Household> result = residentService.searchHouseholds(search, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/households/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHouseholdById(@PathVariable String id) {
        Household hh = residentService.getHouseholdById(id);
        if (hh == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Household not found");
        }
        List<Resident> members = residentService.getResidentsByHouseholdId(id);
        
        Map<String, Object> response = new HashMap<>();
        response.put("id", hh.getId());
        response.put("code", hh.getId());
        response.put("apartmentNo", hh.getApartmentNo());
        response.put("floor", hh.getFloor());
        response.put("area", hh.getArea());
        response.put("headName", hh.getOwnerName());
        response.put("ownerName", hh.getOwnerName());
        response.put("phone", hh.getPhone());
        response.put("status", hh.getStatus());
        response.put("note", hh.getNote());
        response.put("membersCount", hh.getMembersCount());
        response.put("memberCount", hh.getMembersCount());
        response.put("motorcycleCount", hh.getMotorcycleCount());
        response.put("carCount", hh.getCarCount());
        response.put("members", members);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/households")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Household>> createHousehold(
            @RequestBody Household household,
            @RequestParam(required = false) String actor) {
        try {
            Household saved = residentService.saveHousehold(household, actor);
            return ResponseEntity.ok(ApiResponse.success("Household created successfully", saved));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PutMapping("/households/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Household>> updateHousehold(
            @PathVariable String id,
            @RequestBody Household household,
            @RequestParam(required = false) String actor) {
        try {
            household.setId(id);
            Household saved = residentService.saveHousehold(household, actor);
            return ResponseEntity.ok(ApiResponse.success("Household updated successfully", saved));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @DeleteMapping("/households/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> deleteHousehold(
            @PathVariable String id,
            @RequestParam(required = false) String actor) {
        try {
            residentService.deleteHousehold(id, actor);
            return ResponseEntity.ok(ApiResponse.success("Household deleted successfully", null));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @GetMapping("/residents")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<Page<Resident>>> searchResidents(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String householdId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Resident> result = residentService.searchResidents(search, status, gender, householdId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/residents/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<Resident>> getResidentById(@PathVariable String id) {
        Resident r = residentService.getResidentById(id);
        if (r == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resident not found");
        }
        return ResponseEntity.ok(ApiResponse.success(r));
    }

    @PostMapping("/residents")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Resident>> createResident(
            @RequestBody Resident resident,
            @RequestParam(required = false) String actor) {
        try {
            Resident saved = residentService.saveResident(resident, actor);
            return ResponseEntity.ok(ApiResponse.success("Resident saved successfully", saved));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PutMapping("/residents/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Resident>> updateResident(
            @PathVariable String id,
            @RequestBody Resident resident,
            @RequestParam(required = false) String actor) {
        try {
            resident.setId(id);
            Resident saved = residentService.saveResident(resident, actor);
            return ResponseEntity.ok(ApiResponse.success("Resident updated successfully", saved));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @DeleteMapping("/residents/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> deleteResident(
            @PathVariable String id,
            @RequestParam(required = false) String actor) {
        residentService.deleteResident(id, actor);
        return ResponseEntity.ok(ApiResponse.success("Resident deleted successfully", null));
    }

    @PostMapping("/households/{householdId}/members/{residentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Resident>> addMember(
            @PathVariable String householdId,
            @PathVariable String residentId,
            @RequestParam(required = false) String actor) {
        try {
            Resident saved = residentService.addMember(householdId, residentId, actor);
            return ResponseEntity.ok(ApiResponse.success("Member added to household", saved));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @DeleteMapping("/households/{householdId}/members/{residentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Resident>> removeMember(
            @PathVariable String householdId,
            @PathVariable String residentId,
            @RequestParam(required = false) String actor) {
        try {
            Resident saved = residentService.removeMember(householdId, residentId, actor);
            return ResponseEntity.ok(ApiResponse.success("Member removed from household", saved));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> globalSearch(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "all") String type) {
        List<Map<String, Object>> results = residentService.globalSearch(q, type);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/activity")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<List<ActivityLog>>> getActivity(
            @RequestParam(defaultValue = "50") int limit) {
        List<ActivityLog> logs = residentService.loadActivity(limit);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }
}
