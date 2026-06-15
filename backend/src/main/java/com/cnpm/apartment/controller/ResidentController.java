package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.*;
import com.cnpm.apartment.service.ResidentExportService;
import com.cnpm.apartment.service.ResidentManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/residents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ResidentController {

    private static final String EXCEL_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final DateTimeFormatter FILE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd_HHmm");

    private final ResidentManagementService residentManagementService;
    private final ResidentExportService residentExportService;

    @GetMapping("/households")
    public ResponseEntity<ApiResponse<Page<HouseholdDTO>>> getHouseholds(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("id"));
        return ResponseEntity.ok(ApiResponse.success(
                residentManagementService.searchHouseholds(search, status, pageable)));
    }

    @GetMapping("/households/{id}")
    public ResponseEntity<ApiResponse<HouseholdDTO>> getHousehold(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(residentManagementService.getHousehold(id)));
    }

    @PostMapping("/households")
    public ResponseEntity<ApiResponse<HouseholdDTO>> createHousehold(
            @Valid @RequestBody HouseholdRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Household created successfully",
                residentManagementService.createHousehold(request, actor)));
    }

    @PutMapping("/households/{id}")
    public ResponseEntity<ApiResponse<HouseholdDTO>> updateHousehold(
            @PathVariable String id,
            @Valid @RequestBody HouseholdRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Household updated successfully",
                residentManagementService.updateHousehold(id, request, actor)));
    }

    @DeleteMapping("/households/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteHousehold(
            @PathVariable String id,
            @RequestParam(defaultValue = "admin") String actor) {
        residentManagementService.deleteHousehold(id, actor);
        return ResponseEntity.ok(ApiResponse.success("Household deleted successfully", null));
    }

    @GetMapping("/residents")
    public ResponseEntity<ApiResponse<Page<ResidentDTO>>> getResidents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String householdId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("fullName"));
        return ResponseEntity.ok(ApiResponse.success(
                residentManagementService.searchResidents(search, status, gender, householdId, pageable)));
    }

    @GetMapping("/residents/{id}")
    public ResponseEntity<ApiResponse<ResidentDTO>> getResident(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(residentManagementService.getResident(id)));
    }

    @PostMapping("/residents")
    public ResponseEntity<ApiResponse<ResidentDTO>> createResident(
            @Valid @RequestBody ResidentRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Resident created successfully",
                residentManagementService.createResident(request, actor)));
    }

    @PutMapping("/residents/{id}")
    public ResponseEntity<ApiResponse<ResidentDTO>> updateResident(
            @PathVariable String id,
            @Valid @RequestBody ResidentRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Resident updated successfully",
                residentManagementService.updateResident(id, request, actor)));
    }

    @DeleteMapping("/residents/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteResident(
            @PathVariable String id,
            @RequestParam(defaultValue = "admin") String actor) {
        residentManagementService.deleteResident(id, actor);
        return ResponseEntity.ok(ApiResponse.success("Resident deleted successfully", null));
    }

    @PostMapping("/households/{householdId}/members/{residentId}")
    public ResponseEntity<ApiResponse<ResidentDTO>> addMember(
            @PathVariable String householdId,
            @PathVariable String residentId,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Member added successfully",
                residentManagementService.addMember(householdId, residentId, actor)));
    }

    @DeleteMapping("/households/{householdId}/members/{residentId}")
    public ResponseEntity<ApiResponse<ResidentDTO>> removeMember(
            @PathVariable String householdId,
            @PathVariable String residentId,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Member removed successfully",
                residentManagementService.removeMember(householdId, residentId, actor)));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<ResidentStatsDTO>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(residentManagementService.getStats()));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ResidentSearchResultDTO>>> globalSearch(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "all") String type) {
        return ResponseEntity.ok(ApiResponse.success(residentManagementService.globalSearch(q, type)));
    }

    @GetMapping("/activity")
    public ResponseEntity<ApiResponse<List<ResidentActivityLogDTO>>> getActivity(
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(ApiResponse.success(residentManagementService.getActivityLogs(limit)));
    }

    @GetMapping("/export/households")
    public ResponseEntity<byte[]> exportHouseholds() throws IOException {
        byte[] data = residentExportService.exportHouseholds();
        String filename = "households_" + LocalDateTime.now().format(FILE_FMT) + ".xlsx";
        return excel(filename, data);
    }

    @GetMapping("/export/residents")
    public ResponseEntity<byte[]> exportResidents() throws IOException {
        byte[] data = residentExportService.exportResidents();
        String filename = "residents_" + LocalDateTime.now().format(FILE_FMT) + ".xlsx";
        return excel(filename, data);
    }

    private ResponseEntity<byte[]> excel(String filename, byte[] data) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(EXCEL_CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(data);
    }
}
