package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Resident;
import com.cnpm.apartment.model.ActivityLog;
import com.cnpm.apartment.repository.ActivityLogRepository;
import com.cnpm.apartment.service.ResidentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/residents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ResidentController {

    private final ResidentService residentService;
    private final ActivityLogRepository activityLogRepository;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(residentService.getStats()));
    }

    @GetMapping("/households")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<Page<Household>>> getHouseholds(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id"));
        return ResponseEntity.ok(ApiResponse.success(residentService.getHouseholds(status, search, pageable)));
    }

    @GetMapping("/residents")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<Page<Resident>>> getResidents(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "") String gender,
            @RequestParam(defaultValue = "") String householdId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id"));
        return ResponseEntity.ok(ApiResponse.success(residentService.getResidents(status, gender, householdId, search, pageable)));
    }

    @GetMapping("/households/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<?> getHousehold(@PathVariable String id) {
        Household hh = residentService.getHousehold(id)
                .orElseThrow(() -> new RuntimeException("Household not found"));
        List<Resident> members = residentService.getHouseholdMembers(id);

        Map<String, Object> response = new HashMap<>();
        response.put("id", hh.getId());
        response.put("code", hh.getId());
        response.put("apartmentNo", hh.getId()); // Match residents.js apartmentNo expectation
        response.put("ownerName", hh.getOwnerName());
        response.put("membersCount", hh.getMembersCount());
        response.put("area", hh.getArea());
        response.put("motorcycleCount", hh.getMotorcycleCount());
        response.put("carCount", hh.getCarCount());
        response.put("status", hh.getStatus());
        response.put("phone", hh.getPhone());
        response.put("note", hh.getNote());
        response.put("members", members);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/residents/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<Resident>> getResident(@PathVariable String id) {
        Resident r = residentService.getResident(id)
                .orElseThrow(() -> new RuntimeException("Resident not found"));
        return ResponseEntity.ok(ApiResponse.success(r));
    }

    @PostMapping("/households")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Household>> createHousehold(@RequestBody Household household) {
        return ResponseEntity.ok(ApiResponse.success(residentService.saveHousehold(household)));
    }

    @PutMapping("/households/{id}")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Household>> updateHousehold(@PathVariable String id, @RequestBody Household household) {
        household.setId(id);
        return ResponseEntity.ok(ApiResponse.success(residentService.saveHousehold(household)));
    }

    @DeleteMapping("/households/{id}")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Void>> deleteHousehold(@PathVariable String id) {
        residentService.deleteHousehold(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/residents")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Resident>> createResident(@RequestBody Resident resident) {
        return ResponseEntity.ok(ApiResponse.success(residentService.saveResident(resident)));
    }

    @PutMapping("/residents/{id}")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Resident>> updateResident(@PathVariable String id, @RequestBody Resident resident) {
        resident.setId(id);
        return ResponseEntity.ok(ApiResponse.success(residentService.saveResident(resident)));
    }

    @DeleteMapping("/residents/{id}")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Void>> deleteResident(@PathVariable String id) {
        residentService.deleteResident(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/households/{id}/members")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Void>> addMember(@PathVariable String id, @RequestBody Map<String, String> request) {
        String residentId = request.get("residentId");
        if (residentId == null) {
            // Support query param fallback or raw body
            residentId = request.get("value");
        }
        residentService.addMember(id, residentId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/households/{id}/members/{residentId}")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Void>> removeMember(@PathVariable String id, @PathVariable String residentId) {
        residentService.removeMember(id, residentId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> globalSearch(
            @RequestParam(required = false, defaultValue = "") String q,
            @RequestParam(required = false, defaultValue = "all") String type) {
        
        List<Map<String, Object>> results = new java.util.ArrayList<>();
        if (q == null || q.trim().isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(results));
        }

        if ("all".equalsIgnoreCase(type) || "resident".equalsIgnoreCase(type)) {
            List<Resident> residents = residentService.getResidents("ALL", "", "", q, Pageable.unpaged()).getContent();
            for (Resident r : residents) {
                Map<String, Object> map = new HashMap<>();
                map.put("type", "Resident");
                map.put("id", r.getId());
                map.put("mainInfo", r.getFullName() + " - " + (r.getIdentityNo() != null ? r.getIdentityNo() : ""));
                map.put("detail", "Phone: " + (r.getPhone() != null ? r.getPhone() : "-") + 
                                  " | Apartment: " + (r.getHouseholdId() != null ? r.getHouseholdId() : "No household") + 
                                  " | Status: " + r.getStatus());
                results.add(map);
            }
        }

        if ("all".equalsIgnoreCase(type) || "household".equalsIgnoreCase(type)) {
            List<Household> households = residentService.getHouseholds("ALL", q, Pageable.unpaged()).getContent();
            for (Household h : households) {
                Map<String, Object> map = new HashMap<>();
                map.put("type", "Household");
                map.put("id", h.getId());
                map.put("mainInfo", h.getId());
                map.put("detail", "Head: " + h.getOwnerName() + 
                                  " | Members: " + h.getMembersCount() + 
                                  " | Status: " + h.getStatus());
                results.add(map);
            }
        }

        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/activity")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<List<ActivityLog>>> getActivity() {
        return ResponseEntity.ok(ApiResponse.success(activityLogRepository.findTop50ByOrderByCreatedAtDesc()));
    }
}
