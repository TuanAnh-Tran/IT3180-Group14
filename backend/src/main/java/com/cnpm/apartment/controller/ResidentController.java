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
import org.springframework.security.access.prepost.PreAuthorize;
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
        PageRequest pageable = pageRequest(page, size, Sort.by("id"));
        return ResponseEntity.ok(ApiResponse.success(
                residentManagementService.searchHouseholds(search, status, pageable)));
    }

    @GetMapping("/households/{id}")
    public ResponseEntity<ApiResponse<HouseholdDTO>> getHousehold(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(residentManagementService.getHousehold(id)));
    }

    @PostMapping("/households")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<HouseholdDTO>> createHousehold(
            @Valid @RequestBody HouseholdRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Household created successfully",
                residentManagementService.createHousehold(request, actor)));
    }

    @PutMapping("/households/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<HouseholdDTO>> updateHousehold(
            @PathVariable String id,
            @Valid @RequestBody HouseholdRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Household updated successfully",
                residentManagementService.updateHousehold(id, request, actor)));
    }

    @DeleteMapping("/households/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> deleteHousehold(
            @PathVariable String id,
            @RequestParam(defaultValue = "admin") String actor) {
        residentManagementService.deleteHousehold(id, actor);
        return ResponseEntity.ok(ApiResponse.success("Household deleted successfully", null));
    }

    @PostMapping("/households/{id}/head")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<HouseholdDTO>> changeHouseholdHead(
            @PathVariable String id,
            @Valid @RequestBody ChangeHouseholdHeadRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Household head changed successfully",
                residentManagementService.changeHouseholdHead(id, request, actor)));
    }

    @PostMapping("/households/{id}/ownership-transfer")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<HouseholdDTO>> transferOwnership(
            @PathVariable String id,
            @Valid @RequestBody OwnershipTransferRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Ownership transferred successfully",
                residentManagementService.transferOwnership(id, request, actor)));
    }

    @PostMapping("/households/{id}/split")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<HouseholdDTO>> splitHousehold(
            @PathVariable String id,
            @Valid @RequestBody SplitHouseholdRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Household split successfully",
                residentManagementService.splitHousehold(id, request, actor)));
    }

    @GetMapping("/residents")
    public ResponseEntity<ApiResponse<Page<ResidentDTO>>> getResidents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String householdId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = pageRequest(page, size, Sort.by("fullName"));
        return ResponseEntity.ok(ApiResponse.success(
                residentManagementService.searchResidents(search, status, gender, householdId, pageable)));
    }

    @GetMapping("/residents/{id}")
    public ResponseEntity<ApiResponse<ResidentDTO>> getResident(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(residentManagementService.getResident(id)));
    }

    @PostMapping("/residents")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ResidentDTO>> createResident(
            @Valid @RequestBody ResidentRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Resident created successfully",
                residentManagementService.createResident(request, actor)));
    }

    @PutMapping("/residents/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ResidentDTO>> updateResident(
            @PathVariable String id,
            @Valid @RequestBody ResidentRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Resident updated successfully",
                residentManagementService.updateResident(id, request, actor)));
    }

    @DeleteMapping("/residents/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> deleteResident(
            @PathVariable String id,
            @RequestParam(defaultValue = "admin") String actor) {
        residentManagementService.deleteResident(id, actor);
        return ResponseEntity.ok(ApiResponse.success("Resident deleted successfully", null));
    }

    @PostMapping("/residents/{id}/death")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ResidentDTO>> reportDeath(
            @PathVariable String id,
            @Valid @RequestBody DeathReportRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Resident marked deceased successfully",
                residentManagementService.reportDeath(id, request, actor)));
    }

    @GetMapping("/residents/{id}/temporary-records")
    public ResponseEntity<ApiResponse<List<TemporaryResidenceDTO>>> getTemporaryResidenceRecords(
            @PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(
                residentManagementService.getTemporaryResidenceRecords(id)));
    }

    @PostMapping("/residents/{id}/temporary-records")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<TemporaryResidenceDTO>> createTemporaryResidenceRecord(
            @PathVariable String id,
            @Valid @RequestBody TemporaryResidenceRequest request,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Residence record created successfully",
                residentManagementService.createTemporaryResidenceRecord(id, request, actor)));
    }

    @PostMapping("/households/{householdId}/members/{residentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ResidentDTO>> addMember(
            @PathVariable String householdId,
            @PathVariable String residentId,
            @RequestParam(defaultValue = "admin") String actor) {
        return ResponseEntity.ok(ApiResponse.success(
                "Member added successfully",
                residentManagementService.addMember(householdId, residentId, actor)));
    }

    @DeleteMapping("/households/{householdId}/members/{residentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
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

    @GetMapping("/stats/trend")
    public ResponseEntity<ApiResponse<List<DemographicsTrendDTO>>> getDemographicsTrend(
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}") int year) {
        return ResponseEntity.ok(ApiResponse.success(residentManagementService.getDemographicsTrend(year)));
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
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<byte[]> exportHouseholds() throws IOException {
        byte[] data = residentExportService.exportHouseholds();
        String filename = "households_" + LocalDateTime.now().format(FILE_FMT) + ".xlsx";
        return excel(filename, data);
    }

    @GetMapping("/export/residents")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
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

    private PageRequest pageRequest(int page, int size, Sort sort) {
        return PageRequest.of(Math.max(page, 0), Math.max(size, 1), sort);
    }
}
