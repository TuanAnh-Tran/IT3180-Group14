package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.*;
import com.cnpm.apartment.model.User;
import com.cnpm.apartment.model.enums.UserRole;
import com.cnpm.apartment.repository.UserRepository;
import com.cnpm.apartment.service.ResidentExportService;
import com.cnpm.apartment.service.ResidentManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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
    private final UserRepository userRepository;

    @GetMapping("/households")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<Page<HouseholdDTO>>> getHouseholds(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = pageRequest(page, size, Sort.by("id"));
        if (isResidentUser()) {
            HouseholdDTO household = ownHousehold();
            List<HouseholdDTO> content = matchesHouseholdFilter(household, search, status)
                    ? List.of(household)
                    : List.of();
            return ResponseEntity.ok(ApiResponse.success(new PageImpl<>(content, pageable, content.size())));
        }
        return ResponseEntity.ok(ApiResponse.success(
                residentManagementService.searchHouseholds(search, status, pageable)));
    }

    @GetMapping("/households/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<HouseholdDTO>> getHousehold(@PathVariable String id) {
        assertResidentHouseholdAccess(id);
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
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<Page<ResidentDTO>>> getResidents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String householdId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = pageRequest(page, size, Sort.by("fullName"));
        if (isResidentUser()) {
            householdId = allowedResidentHouseholdId(householdId);
        }
        return ResponseEntity.ok(ApiResponse.success(
                residentManagementService.searchResidents(search, status, gender, householdId, pageable)));
    }

    @GetMapping("/residents/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<ResidentDTO>> getResident(@PathVariable String id) {
        ResidentDTO resident = residentManagementService.getResident(id);
        assertResidentHouseholdAccess(resident.getHouseholdId());
        return ResponseEntity.ok(ApiResponse.success(resident));
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
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<List<TemporaryResidenceDTO>>> getTemporaryResidenceRecords(
            @PathVariable String id) {
        ResidentDTO resident = residentManagementService.getResident(id);
        assertResidentHouseholdAccess(resident.getHouseholdId());
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
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<ResidentStatsDTO>> getStats() {
        if (isResidentUser()) {
            HouseholdDTO household = ownHousehold();
            List<ResidentDTO> members = household.getMembers() != null ? household.getMembers() : List.of();
            long residents = members.stream().filter(r -> !r.isArchived()).count();
            long permanent = members.stream().filter(r -> !r.isArchived() && "PERMANENT".equals(r.getStatus())).count();
            long temporary = members.stream().filter(r -> !r.isArchived() && "TEMPORARY".equals(r.getStatus())).count();
            long away = members.stream().filter(r -> !r.isArchived() && "TEMPORARILY_AWAY".equals(r.getStatus())).count();
            long movedOut = members.stream().filter(r -> !r.isArchived() && "MOVED_OUT".equals(r.getStatus())).count();
            long deceased = members.stream().filter(r -> !r.isArchived() && "DECEASED".equals(r.getStatus())).count();
            return ResponseEntity.ok(ApiResponse.success(ResidentStatsDTO.builder()
                    .totalHouseholds(1)
                    .totalResidents(residents)
                    .occupiedHouseholds("OCCUPIED".equals(household.getStatus()) ? 1 : 0)
                    .vacantHouseholds("VACANT".equals(household.getStatus()) ? 1 : 0)
                    .permanentResidents(permanent)
                    .temporaryResidents(temporary)
                    .temporarilyAwayResidents(away)
                    .movedOutResidents(movedOut)
                    .deceasedResidents(deceased)
                    .archivedResidents(0)
                    .build()));
        }
        return ResponseEntity.ok(ApiResponse.success(residentManagementService.getStats()));
    }

    @GetMapping("/stats/trend")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<List<DemographicsTrendDTO>>> getDemographicsTrend(
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}") int year) {
        if (isResidentUser()) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        return ResponseEntity.ok(ApiResponse.success(residentManagementService.getDemographicsTrend(year)));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<List<ResidentSearchResultDTO>>> globalSearch(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "all") String type) {
        if (isResidentUser()) {
            return ResponseEntity.ok(ApiResponse.success(ownSearchResults(q, type)));
        }
        return ResponseEntity.ok(ApiResponse.success(residentManagementService.globalSearch(q, type)));
    }

    @GetMapping("/activity")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'USER')")
    public ResponseEntity<ApiResponse<List<ResidentActivityLogDTO>>> getActivity(
            @RequestParam(defaultValue = "50") int limit) {
        if (isResidentUser()) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
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

    private boolean isResidentUser() {
        return currentUser().getRole() == UserRole.ROLE_USER;
    }

    private User currentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Authenticated user was not found."));
    }

    private String ownHouseholdId() {
        String householdId = currentUser().getRoom();
        if (householdId == null || householdId.isBlank()) {
            throw new RuntimeException("Your account is not linked to a household.");
        }
        return householdId.trim();
    }

    private HouseholdDTO ownHousehold() {
        return residentManagementService.getHousehold(ownHouseholdId());
    }

    private String allowedResidentHouseholdId(String requestedHouseholdId) {
        String ownHouseholdId = ownHouseholdId();
        if (requestedHouseholdId != null && !requestedHouseholdId.isBlank()
                && !ownHouseholdId.equalsIgnoreCase(requestedHouseholdId.trim())) {
            throw new RuntimeException("Residents can only view data for their own household.");
        }
        return ownHouseholdId;
    }

    private void assertResidentHouseholdAccess(String householdId) {
        if (!isResidentUser()) {
            return;
        }
        String ownHouseholdId = ownHouseholdId();
        if (householdId == null || !ownHouseholdId.equalsIgnoreCase(householdId.trim())) {
            throw new RuntimeException("Residents can only view data for their own household.");
        }
    }

    private boolean matchesHouseholdFilter(HouseholdDTO household, String search, String status) {
        boolean statusOk = status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)
                || status.equalsIgnoreCase(household.getStatus());
        if (!statusOk) {
            return false;
        }
        if (search == null || search.isBlank()) {
            return true;
        }
        String query = search.trim().toLowerCase();
        String haystack = String.join(" ",
                safe(household.getId()),
                safe(household.getApartmentNo()),
                safe(household.getHeadName()),
                safe(household.getHeadIdentityNo()),
                safe(household.getPhone()),
                safe(household.getStatus()))
                .toLowerCase();
        return haystack.contains(query);
    }

    private List<ResidentSearchResultDTO> ownSearchResults(String q, String type) {
        String query = q == null ? "" : q.trim().toLowerCase();
        String normalizedType = type == null ? "all" : type.trim().toLowerCase();
        HouseholdDTO household = ownHousehold();
        List<ResidentSearchResultDTO> result = new ArrayList<>();

        if ("all".equals(normalizedType) || "household".equals(normalizedType)) {
            String householdText = String.join(" ",
                    safe(household.getId()),
                    safe(household.getApartmentNo()),
                    safe(household.getHeadName()),
                    safe(household.getPhone())).toLowerCase();
            if (query.isBlank() || householdText.contains(query)) {
                result.add(ResidentSearchResultDTO.builder()
                        .type("HOUSEHOLD")
                        .id(household.getId())
                        .mainInfo(household.getApartmentNo())
                        .detail(household.getHeadName())
                        .build());
            }
        }

        if ("all".equals(normalizedType) || "resident".equals(normalizedType)) {
            Page<ResidentDTO> residents = residentManagementService.searchResidents(
                    q, null, null, household.getId(), PageRequest.of(0, 20, Sort.by("fullName")));
            residents.getContent().forEach(resident -> result.add(ResidentSearchResultDTO.builder()
                    .type("RESIDENT")
                    .id(resident.getId())
                    .mainInfo(resident.getFullName())
                    .detail(resident.getIdentityNo())
                    .build()));
        }

        return result;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
