package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.*;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Resident;
import com.cnpm.apartment.model.ResidentActivityLog;
import com.cnpm.apartment.model.enums.HouseholdStatus;
import com.cnpm.apartment.model.enums.ResidentStatus;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.ResidentActivityLogRepository;
import com.cnpm.apartment.repository.ResidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ResidentManagementService {

    private final HouseholdRepository householdRepository;
    private final ResidentRepository residentRepository;
    private final ResidentActivityLogRepository activityLogRepository;

    @Transactional(readOnly = true)
    public Page<HouseholdDTO> searchHouseholds(String search, String status, Pageable pageable) {
        HouseholdStatus parsedStatus = parseHouseholdStatus(status);
        return householdRepository.search(trimToNull(search), parsedStatus, pageable)
                .map(household -> toHouseholdDTO(household, false));
    }

    @Transactional(readOnly = true)
    public HouseholdDTO getHousehold(String id) {
        Household household = getHouseholdOrThrow(id);
        return toHouseholdDTO(household, true);
    }

    @Transactional
    public HouseholdDTO createHousehold(HouseholdRequest request, String actor) {
        String code = normalizeCode(request.getCode());
        if (householdRepository.existsById(code)) {
            throw new RuntimeException("Household code already exists.");
        }
        String apartmentNo = clean(request.getApartmentNo());
        if (householdRepository.existsByApartmentNoIgnoreCase(apartmentNo)) {
            throw new RuntimeException("Apartment number already exists.");
        }

        Household household = Household.builder()
                .id(code)
                .apartmentNo(apartmentNo)
                .floor(request.getFloor())
                .area(request.getArea())
                .ownerName(clean(request.getHeadName()))
                .phone(clean(request.getPhone()))
                .status(parseHouseholdStatusOrDefault(request.getStatus()))
                .note(clean(request.getNote()))
                .membersCount(0)
                .motorcycleCount(request.getMotorcycleCount())
                .carCount(request.getCarCount())
                .build();

        Household saved = householdRepository.save(household);
        addLog(actor, "CREATE", "HOUSEHOLD", saved.getId(),
                "Created household " + saved.getId() + " for apartment " + saved.getApartmentNo());
        return toHouseholdDTO(saved, true);
    }

    @Transactional
    public HouseholdDTO updateHousehold(String id, HouseholdRequest request, String actor) {
        Household household = getHouseholdOrThrow(id);
        String apartmentNo = clean(request.getApartmentNo());
        if (householdRepository.existsByApartmentNoIgnoreCaseAndIdNot(apartmentNo, household.getId())) {
            throw new RuntimeException("Apartment number already exists.");
        }

        household.setApartmentNo(apartmentNo);
        household.setFloor(request.getFloor());
        household.setArea(request.getArea());
        household.setOwnerName(clean(request.getHeadName()));
        household.setPhone(clean(request.getPhone()));
        household.setStatus(parseHouseholdStatusOrDefault(request.getStatus()));
        household.setNote(clean(request.getNote()));
        household.setMotorcycleCount(request.getMotorcycleCount());
        household.setCarCount(request.getCarCount());

        Household saved = householdRepository.save(household);
        addLog(actor, "UPDATE", "HOUSEHOLD", saved.getId(),
                "Updated household " + saved.getId());
        return toHouseholdDTO(saved, true);
    }

    @Transactional
    public void deleteHousehold(String id, String actor) {
        Household household = getHouseholdOrThrow(id);
        long memberCount = residentRepository.countByHouseholdId(id);
        if (memberCount > 0) {
            throw new RuntimeException("Cannot delete a household that still has residents.");
        }
        householdRepository.delete(household);
        addLog(actor, "DELETE", "HOUSEHOLD", id, "Deleted household " + id);
    }

    @Transactional(readOnly = true)
    public Page<ResidentDTO> searchResidents(
            String search,
            String status,
            String gender,
            String householdId,
            Pageable pageable) {
        ResidentStatus parsedStatus = parseResidentStatus(status);
        return residentRepository.search(
                trimToNull(search),
                parsedStatus,
                trimToNull(gender),
                trimToNull(householdId),
                pageable).map(this::toResidentDTO);
    }

    @Transactional(readOnly = true)
    public ResidentDTO getResident(String id) {
        return toResidentDTO(getResidentOrThrow(id));
    }

    @Transactional
    public ResidentDTO createResident(ResidentRequest request, String actor) {
        String identityNo = clean(request.getIdentityNo());
        if (residentRepository.existsByIdentityNoIgnoreCase(identityNo)) {
            throw new RuntimeException("Citizen ID already exists.");
        }

        Household household = resolveHousehold(request.getHouseholdId());
        Resident resident = Resident.builder()
                .id("RES-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT))
                .fullName(clean(request.getFullName()))
                .gender(clean(request.getGender()))
                .dateOfBirth(request.getDateOfBirth())
                .identityNo(identityNo)
                .phone(clean(request.getPhone()))
                .hometown(clean(request.getHometown()))
                .occupation(clean(request.getOccupation()))
                .relationshipToHead(clean(request.getRelationshipToHead()))
                .status(parseResidentStatusOrDefault(request.getStatus()))
                .household(household)
                .build();

        Resident saved = residentRepository.save(resident);
        refreshMemberCount(household);
        addLog(actor, "CREATE", "RESIDENT", saved.getId(),
                "Created resident " + saved.getFullName());
        return toResidentDTO(saved);
    }

    @Transactional
    public ResidentDTO updateResident(String id, ResidentRequest request, String actor) {
        Resident resident = getResidentOrThrow(id);
        String oldHouseholdId = resident.getHousehold() == null ? null : resident.getHousehold().getId();
        String identityNo = clean(request.getIdentityNo());
        if (residentRepository.existsByIdentityNoIgnoreCaseAndIdNot(identityNo, id)) {
            throw new RuntimeException("Citizen ID already exists.");
        }

        Household newHousehold = resolveHousehold(request.getHouseholdId());
        resident.setFullName(clean(request.getFullName()));
        resident.setGender(clean(request.getGender()));
        resident.setDateOfBirth(request.getDateOfBirth());
        resident.setIdentityNo(identityNo);
        resident.setPhone(clean(request.getPhone()));
        resident.setHometown(clean(request.getHometown()));
        resident.setOccupation(clean(request.getOccupation()));
        resident.setRelationshipToHead(clean(request.getRelationshipToHead()));
        resident.setStatus(parseResidentStatusOrDefault(request.getStatus()));
        resident.setHousehold(newHousehold);

        Resident saved = residentRepository.save(resident);
        refreshMemberCountById(oldHouseholdId);
        refreshMemberCount(newHousehold);
        addLog(actor, "UPDATE", "RESIDENT", saved.getId(),
                "Updated resident " + saved.getFullName());
        return toResidentDTO(saved);
    }

    @Transactional
    public void deleteResident(String id, String actor) {
        Resident resident = getResidentOrThrow(id);
        String householdId = resident.getHousehold() == null ? null : resident.getHousehold().getId();
        residentRepository.delete(resident);
        refreshMemberCountById(householdId);
        addLog(actor, "DELETE", "RESIDENT", id,
                "Deleted resident " + resident.getFullName());
    }

    @Transactional
    public ResidentDTO addMember(String householdId, String residentId, String actor) {
        Household household = getHouseholdOrThrow(householdId);
        Resident resident = getResidentOrThrow(residentId);
        String oldHouseholdId = resident.getHousehold() == null ? null : resident.getHousehold().getId();
        resident.setHousehold(household);
        Resident saved = residentRepository.save(resident);
        refreshMemberCountById(oldHouseholdId);
        refreshMemberCount(household);
        addLog(actor, "ADD_MEMBER", "HOUSEHOLD", household.getId(),
                "Added resident " + saved.getFullName() + " to household " + household.getId());
        return toResidentDTO(saved);
    }

    @Transactional
    public ResidentDTO removeMember(String householdId, String residentId, String actor) {
        Household household = getHouseholdOrThrow(householdId);
        Resident resident = getResidentOrThrow(residentId);
        if (resident.getHousehold() == null || !household.getId().equals(resident.getHousehold().getId())) {
            throw new RuntimeException("Resident is not a member of this household.");
        }
        resident.setHousehold(null);
        Resident saved = residentRepository.save(resident);
        refreshMemberCount(household);
        addLog(actor, "REMOVE_MEMBER", "HOUSEHOLD", household.getId(),
                "Removed resident " + saved.getFullName() + " from household " + household.getId());
        return toResidentDTO(saved);
    }

    @Transactional(readOnly = true)
    public ResidentStatsDTO getStats() {
        return ResidentStatsDTO.builder()
                .totalHouseholds(householdRepository.count())
                .totalResidents(residentRepository.count())
                .occupiedHouseholds(householdRepository.countByStatus(HouseholdStatus.OCCUPIED))
                .vacantHouseholds(householdRepository.countByStatus(HouseholdStatus.VACANT))
                .permanentResidents(residentRepository.countByStatus(ResidentStatus.PERMANENT))
                .temporaryResidents(residentRepository.countByStatus(ResidentStatus.TEMPORARY))
                .temporarilyAwayResidents(residentRepository.countByStatus(ResidentStatus.TEMPORARILY_AWAY))
                .movedOutResidents(residentRepository.countByStatus(ResidentStatus.MOVED_OUT))
                .build();
    }

    @Transactional(readOnly = true)
    public List<ResidentSearchResultDTO> globalSearch(String query, String type) {
        String normalizedType = clean(type).toLowerCase(Locale.ROOT);
        Pageable limit = PageRequest.of(0, 10, Sort.by("id"));
        List<ResidentSearchResultDTO> results = new ArrayList<>();

        if (normalizedType.isBlank() || "all".equals(normalizedType) || "resident".equals(normalizedType)) {
            residentRepository.search(trimToNull(query), null, null, null, limit)
                    .forEach(resident -> results.add(ResidentSearchResultDTO.builder()
                            .type("Resident")
                            .id(resident.getId())
                            .mainInfo(resident.getFullName() + " - " + resident.getIdentityNo())
                            .detail(buildResidentDetail(resident))
                            .build()));
        }

        if (normalizedType.isBlank() || "all".equals(normalizedType) || "household".equals(normalizedType)) {
            householdRepository.search(trimToNull(query), null, limit)
                    .forEach(household -> results.add(ResidentSearchResultDTO.builder()
                            .type("Household")
                            .id(household.getId())
                            .mainInfo(household.getId() + " - " + nullSafe(household.getApartmentNo()))
                            .detail("Head: " + household.getOwnerName()
                                    + " | Members: " + household.getMembersCount()
                                    + " | Status: " + household.getStatus())
                            .build()));
        }

        return results;
    }

    @Transactional(readOnly = true)
    public List<ResidentActivityLogDTO> getActivityLogs(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        return activityLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, safeLimit))
                .stream()
                .map(this::toActivityLogDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<HouseholdDTO> getAllHouseholdsForExport() {
        return householdRepository.findAll(Sort.by("id")).stream()
                .map(household -> toHouseholdDTO(household, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ResidentDTO> getAllResidentsForExport() {
        return residentRepository.findAll(Sort.by("fullName")).stream()
                .map(this::toResidentDTO)
                .toList();
    }

    private Household getHouseholdOrThrow(String id) {
        return householdRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Household not found."));
    }

    private Resident getResidentOrThrow(String id) {
        return residentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resident not found."));
    }

    private Household resolveHousehold(String householdId) {
        String cleaned = trimToNull(householdId);
        return cleaned == null ? null : getHouseholdOrThrow(cleaned);
    }

    private void refreshMemberCount(Household household) {
        if (household == null) {
            return;
        }
        household.setMembersCount((int) residentRepository.countByHouseholdId(household.getId()));
        householdRepository.save(household);
    }

    private void refreshMemberCountById(String householdId) {
        if (householdId == null || householdId.isBlank()) {
            return;
        }
        householdRepository.findById(householdId).ifPresent(this::refreshMemberCount);
    }

    private HouseholdDTO toHouseholdDTO(Household household, boolean includeMembers) {
        List<ResidentDTO> members = includeMembers
                ? residentRepository.findByHouseholdIdOrderByFullNameAsc(household.getId())
                        .stream()
                        .map(this::toResidentDTO)
                        .toList()
                : null;

        return HouseholdDTO.builder()
                .id(household.getId())
                .code(household.getId())
                .apartmentNo(nullSafe(household.getApartmentNo()))
                .floor(household.getFloor())
                .area(household.getArea())
                .headName(household.getOwnerName())
                .phone(nullSafe(household.getPhone()))
                .status(household.getStatus() == null ? HouseholdStatus.OCCUPIED.name() : household.getStatus().name())
                .note(nullSafe(household.getNote()))
                .memberCount(household.getMembersCount())
                .motorcycleCount(household.getMotorcycleCount())
                .carCount(household.getCarCount())
                .members(members)
                .build();
    }

    private ResidentDTO toResidentDTO(Resident resident) {
        Household household = resident.getHousehold();
        return ResidentDTO.builder()
                .id(resident.getId())
                .fullName(resident.getFullName())
                .gender(nullSafe(resident.getGender()))
                .dateOfBirth(resident.getDateOfBirth())
                .identityNo(resident.getIdentityNo())
                .phone(nullSafe(resident.getPhone()))
                .hometown(nullSafe(resident.getHometown()))
                .occupation(nullSafe(resident.getOccupation()))
                .relationshipToHead(nullSafe(resident.getRelationshipToHead()))
                .status(resident.getStatus() == null ? ResidentStatus.PERMANENT.name() : resident.getStatus().name())
                .householdId(household == null ? "" : household.getId())
                .apartmentNo(household == null ? "" : nullSafe(household.getApartmentNo()))
                .householdHeadName(household == null ? "" : household.getOwnerName())
                .createdAt(resident.getCreatedAt())
                .updatedAt(resident.getUpdatedAt())
                .build();
    }

    private ResidentActivityLogDTO toActivityLogDTO(ResidentActivityLog log) {
        return ResidentActivityLogDTO.builder()
                .id(log.getId())
                .actor(log.getActor())
                .action(log.getAction())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .detail(log.getDetail())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private String buildResidentDetail(Resident resident) {
        Household household = resident.getHousehold();
        String apartment = household == null ? "No household" : household.getApartmentNo();
        return "Phone: " + nullSafe(resident.getPhone())
                + " | Apartment: " + nullSafe(apartment)
                + " | Status: " + (resident.getStatus() == null ? ResidentStatus.PERMANENT : resident.getStatus());
    }

    private void addLog(String actor, String action, String targetType, String targetId, String detail) {
        activityLogRepository.save(ResidentActivityLog.builder()
                .id("RAL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT))
                .actor(clean(actor).isBlank() ? "system" : clean(actor))
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .detail(detail)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private HouseholdStatus parseHouseholdStatus(String value) {
        String cleaned = trimToNull(value);
        if (cleaned == null || "ALL".equalsIgnoreCase(cleaned)) {
            return null;
        }
        return HouseholdStatus.valueOf(cleaned.trim().toUpperCase(Locale.ROOT));
    }

    private HouseholdStatus parseHouseholdStatusOrDefault(String value) {
        HouseholdStatus parsed = parseHouseholdStatus(value);
        return parsed == null ? HouseholdStatus.OCCUPIED : parsed;
    }

    private ResidentStatus parseResidentStatus(String value) {
        String cleaned = trimToNull(value);
        if (cleaned == null || "ALL".equalsIgnoreCase(cleaned)) {
            return null;
        }
        return ResidentStatus.valueOf(cleaned.trim().toUpperCase(Locale.ROOT));
    }

    private ResidentStatus parseResidentStatusOrDefault(String value) {
        ResidentStatus parsed = parseResidentStatus(value);
        return parsed == null ? ResidentStatus.PERMANENT : parsed;
    }

    private String normalizeCode(String value) {
        return clean(value).toUpperCase(Locale.ROOT).replaceAll("\\s+", "-");
    }

    private String trimToNull(String value) {
        String cleaned = clean(value);
        return cleaned.isBlank() ? null : cleaned;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
