package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.*;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Resident;
import com.cnpm.apartment.model.ResidentActivityLog;
import com.cnpm.apartment.model.TemporaryResidenceRecord;
import com.cnpm.apartment.model.enums.HouseholdStatus;
import com.cnpm.apartment.model.enums.ResidenceRecordType;
import com.cnpm.apartment.model.enums.ResidentStatus;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.ResidentActivityLogRepository;
import com.cnpm.apartment.repository.ResidentRepository;
import com.cnpm.apartment.repository.TemporaryResidenceRecordRepository;
import com.cnpm.apartment.validation.VietnamDataRules;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ResidentManagementService {

    private final HouseholdRepository householdRepository;
    private final ResidentRepository residentRepository;
    private final ResidentActivityLogRepository activityLogRepository;
    private final TemporaryResidenceRecordRepository temporaryResidenceRecordRepository;

    @Transactional(readOnly = true)
    public Page<HouseholdDTO> searchHouseholds(String search, String status, Pageable pageable) {
        HouseholdStatus parsedStatus = parseHouseholdStatus(status);
        return householdRepository.search(trimToNull(search), parsedStatus, pageable)
                .map(household -> toHouseholdDTO(household, false));
    }

    @Transactional(readOnly = true)
    public HouseholdDTO getHousehold(String id) {
        return toHouseholdDTO(getHouseholdOrThrow(id), true);
    }

    @Transactional
    public HouseholdDTO createHousehold(HouseholdRequest request, String actor) {
        Household household = createHouseholdEntity(request, actor, true);
        validateVacantHouseholdState(household, request.getHeadIdentityNo());
        assignHeadIfRequested(household, request.getHeadIdentityNo(), actor, "CREATE_HOUSEHOLD");
        refreshMemberCount(household);
        return toHouseholdDTO(household, true);
    }

    @Transactional
    public HouseholdDTO updateHousehold(String id, HouseholdRequest request, String actor) {
        Household household = getHouseholdOrThrow(id);
        String apartmentNo = clean(request.getApartmentNo());
        if (householdRepository.existsByApartmentNoIgnoreCaseAndIdNot(apartmentNo, household.getId())) {
            throw new RuntimeException("Apartment number already exists.");
        }

        applyHouseholdFields(household, request);
        validateVacantHouseholdState(household, request.getHeadIdentityNo());
        Household saved = householdRepository.save(household);
        assignHeadIfRequested(saved, request.getHeadIdentityNo(), actor, "UPDATE_HOUSEHOLD");
        refreshMemberCount(saved);
        addLog(actor, "UPDATE", "HOUSEHOLD", saved.getId(), "Updated household " + saved.getId());
        return toHouseholdDTO(saved, true);
    }

    @Transactional
    public void deleteHousehold(String id, String actor) {
        Household household = getHouseholdOrThrow(id);
        long memberCount = residentRepository.countActiveMembers(id);
        if (memberCount > 0) {
            throw new RuntimeException("Cannot archive a household that still has active residents.");
        }
        household.setArchived(true);
        household.setArchivedAt(LocalDateTime.now());
        household.setStatus(HouseholdStatus.VACANT);
        householdRepository.save(household);
        addLog(actor, "ARCHIVE", "HOUSEHOLD", id, "Archived household " + id);
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
        String identityNo = VietnamDataRules.requireCitizenId(request.getIdentityNo(), "Citizen ID");
        if (residentRepository.existsByIdentityNoIgnoreCase(identityNo)) {
            throw new RuntimeException("Citizen ID already exists.");
        }

        Household household = resolveHousehold(request.getHouseholdId());
        Resident resident = Resident.builder()
                .id("RES-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT))
                .household(household)
                .build();
        applyResidentFields(resident, request);
        Resident saved = residentRepository.save(resident);
        enforceHouseholdHeadIfNeeded(saved, actor);
        refreshMemberCount(household);
        addLog(actor, "CREATE", "RESIDENT", saved.getId(), "Created resident " + saved.getFullName());
        return toResidentDTO(saved);
    }

    @Transactional
    public ResidentDTO updateResident(String id, ResidentRequest request, String actor) {
        Resident resident = getResidentOrThrow(id);
        String oldHouseholdId = resident.getHousehold() == null ? null : resident.getHousehold().getId();
        String identityNo = VietnamDataRules.requireCitizenId(request.getIdentityNo(), "Citizen ID");
        if (residentRepository.existsByIdentityNoIgnoreCaseAndIdNot(identityNo, id)) {
            throw new RuntimeException("Citizen ID already exists.");
        }

        Household newHousehold = resolveHousehold(request.getHouseholdId());
        applyResidentFields(resident, request);
        resident.setHousehold(newHousehold);

        Resident saved = residentRepository.save(resident);
        enforceHouseholdHeadIfNeeded(saved, actor);
        refreshMemberCountById(oldHouseholdId);
        refreshMemberCount(newHousehold);
        addLog(actor, "UPDATE", "RESIDENT", saved.getId(), "Updated resident " + saved.getFullName());
        return toResidentDTO(saved);
    }

    @Transactional
    public ResidentDTO reportDeath(String id, DeathReportRequest request, String actor) {
        Resident resident = getResidentOrThrow(id);
        LocalDate dateOfDeath = request.getDateOfDeath() == null
                ? LocalDate.now()
                : VietnamDataRules.notFuture(request.getDateOfDeath(), "Date of death");
        if (resident.getDateOfBirth() != null && dateOfDeath.isBefore(resident.getDateOfBirth())) {
            throw new RuntimeException("Date of death cannot be before date of birth.");
        }
        String replacementHeadIdentityNo = VietnamDataRules.optionalCitizenId(
                request.getReplacementHeadIdentityNo(),
                "Replacement head Citizen ID");

        resident.setAlive(false);
        resident.setStatus(ResidentStatus.DECEASED);
        resident.setDateOfDeath(dateOfDeath);
        resident.setRelationshipToHead(clean(resident.getRelationshipToHead()).equalsIgnoreCase("Head")
                ? "Former Head (Deceased)"
                : resident.getRelationshipToHead());
        Resident saved = residentRepository.save(resident);

        Household household = saved.getHousehold();
        if (household != null && isCurrentHead(household, saved)) {
            household.setHeadResident(null);
            household.setNote(appendNote(household.getNote(), "Household head deceased; choose a new head."));
            householdRepository.save(household);
            if (replacementHeadIdentityNo != null) {
                changeHouseholdHead(household.getId(), replacementRequest(replacementHeadIdentityNo, request.getNote()), actor);
            } else {
                addLog(actor, "HEAD_CHANGE_REQUIRED", "HOUSEHOLD", household.getId(),
                        "Household head " + saved.getFullName() + " is deceased. Select a replacement head.");
            }
        }

        refreshMemberCount(household);
        addLog(actor, "MARK_DECEASED", "RESIDENT", saved.getId(), "Marked resident deceased: " + saved.getFullName());
        return toResidentDTO(saved);
    }

    @Transactional
    public void deleteResident(String id, String actor) {
        Resident resident = getResidentOrThrow(id);
        Household household = resident.getHousehold();
        if (household != null && isCurrentHead(household, resident)) {
            household.setHeadResident(null);
            household.setNote(appendNote(household.getNote(), "Household head archived; choose a new head."));
            householdRepository.save(household);
        }
        resident.setArchived(true);
        resident.setArchivedAt(LocalDateTime.now());
        resident.setStatus(ResidentStatus.MOVED_OUT);
        resident.setHousehold(null);
        residentRepository.save(resident);
        refreshMemberCount(household);
        addLog(actor, "ARCHIVE", "RESIDENT", id, "Archived resident " + resident.getFullName());
    }

    @Transactional
    public ResidentDTO addMember(String householdId, String residentId, String actor) {
        Household household = getHouseholdOrThrow(householdId);
        if (household.getStatus() == HouseholdStatus.VACANT) {
            throw new RuntimeException("Cannot add members to a vacant household. Update the household status first.");
        }
        Resident resident = getResidentOrThrow(residentId);
        String oldHouseholdId = resident.getHousehold() == null ? null : resident.getHousehold().getId();
        resident.setHousehold(household);
        resident.setArchived(false);
        if (resident.getStatus() == ResidentStatus.MOVED_OUT) {
            resident.setStatus(ResidentStatus.PERMANENT);
        }
        Resident saved = residentRepository.save(resident);
        enforceHouseholdHeadIfNeeded(saved, actor);
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
        if (isCurrentHead(household, resident)) {
            household.setHeadResident(null);
            household.setNote(appendNote(household.getNote(), "Household head removed; choose a new head."));
            householdRepository.save(household);
        }
        resident.setHousehold(null);
        resident.setRelationshipToHead("");
        resident.setStatus(ResidentStatus.MOVED_OUT);
        Resident saved = residentRepository.save(resident);
        refreshMemberCount(household);
        addLog(actor, "REMOVE_MEMBER", "HOUSEHOLD", household.getId(),
                "Removed resident " + saved.getFullName() + " from household " + household.getId());
        return toResidentDTO(saved);
    }

    @Transactional
    public HouseholdDTO changeHouseholdHead(String householdId, ChangeHouseholdHeadRequest request, String actor) {
        Household household = getHouseholdOrThrow(householdId);
        String identityNo = VietnamDataRules.requireCitizenId(request.getIdentityNo(), "Citizen ID");
        Resident newHead = residentRepository.findByIdentityNoIgnoreCase(identityNo)
                .orElseThrow(() -> new RuntimeException("Resident with the given Citizen ID was not found."));
        if (newHead.isArchived()) {
            throw new RuntimeException("Archived residents cannot be household head.");
        }
        validateCanBeHouseholdHead(newHead);
        if (newHead.getHousehold() == null || !household.getId().equals(newHead.getHousehold().getId())) {
            throw new RuntimeException("New household head must already be a member of this household.");
        }
        setHouseholdHead(household, newHead, actor, clean(request.getReason()));
        return toHouseholdDTO(household, true);
    }

    @Transactional
    public HouseholdDTO transferOwnership(String householdId, OwnershipTransferRequest request, String actor) {
        Household household = getHouseholdOrThrow(householdId);
        String newOwnerPhone = VietnamDataRules.optionalVietnamMobile(request.getNewOwnerPhone(), "New owner phone");
        String newOwnerIdentityNo = VietnamDataRules.optionalCitizenId(request.getNewOwnerIdentityNo(), "New owner Citizen ID");

        household.setPreviousOwnerName(household.getOwnerName());
        household.setOwnerName(VietnamDataRules.requireText(request.getNewOwnerName(), "New owner name"));
        household.setPhone(newOwnerPhone);
        household.setOwnershipTransferredAt(LocalDateTime.now());
        household.setOwnershipNote(clean(request.getNote()));
        householdRepository.save(household);

        if (newOwnerIdentityNo != null) {
            Resident ownerResident = residentRepository.findByIdentityNoIgnoreCase(newOwnerIdentityNo)
                    .orElseThrow(() -> new RuntimeException("New owner resident was not found by Citizen ID."));
            ownerResident.setHousehold(household);
            ownerResident.setArchived(false);
            if (ownerResident.getStatus() == ResidentStatus.MOVED_OUT) {
                ownerResident.setStatus(ResidentStatus.PERMANENT);
            }
            residentRepository.save(ownerResident);
            setHouseholdHead(household, ownerResident, actor, "Ownership transfer");
        }

        refreshMemberCount(household);
        addLog(actor, "TRANSFER_OWNERSHIP", "HOUSEHOLD", household.getId(),
                "Transferred ownership from " + nullSafe(household.getPreviousOwnerName()) + " to " + household.getOwnerName());
        return toHouseholdDTO(household, true);
    }

    @Transactional
    public HouseholdDTO splitHousehold(String sourceHouseholdId, SplitHouseholdRequest request, String actor) {
        Household source = getHouseholdOrThrow(sourceHouseholdId);
        HouseholdRequest newRequest = request.getNewHousehold();
        if (newRequest == null) {
            throw new RuntimeException("New household information is required.");
        }
        List<Resident> movingResidents = request.getResidentIds().stream()
                .map(this::getResidentOrThrow)
                .toList();
        if (movingResidents.stream().anyMatch(r -> r.getHousehold() == null || !source.getId().equals(r.getHousehold().getId()))) {
            throw new RuntimeException("All selected residents must belong to the source household.");
        }
        long activeMovingCount = movingResidents.stream().filter(this::isActiveMember).count();
        long activeSourceCount = residentRepository.countActiveMembers(source.getId());
        if (activeMovingCount < 1) {
            throw new RuntimeException("Select at least one active resident to move to the new household.");
        }
        if (activeSourceCount - activeMovingCount < 1) {
            throw new RuntimeException("The source household must keep at least one active resident after split.");
        }
        if (parseHouseholdStatusOrDefault(newRequest.getStatus()) == HouseholdStatus.VACANT) {
            throw new RuntimeException("The new household created by a split cannot be vacant.");
        }

        Household target = createHouseholdEntity(newRequest, actor, false);
        Resident oldSourceHead = source.getHeadResident();
        for (Resident resident : movingResidents) {
            resident.setHousehold(target);
            residentRepository.save(resident);
        }

        String headIdentity = VietnamDataRules.optionalCitizenId(request.getHeadIdentityNo(), "New household head Citizen ID");
        Resident head = null;
        if (headIdentity != null) {
            head = residentRepository.findByIdentityNoIgnoreCase(headIdentity)
                    .orElseThrow(() -> new RuntimeException("New household head was not found by Citizen ID."));
            Resident selectedHead = head;
            if (movingResidents.stream().noneMatch(r -> Objects.equals(r.getId(), selectedHead.getId()))) {
                throw new RuntimeException("New household head must be one of the residents moved to the new household.");
            }
            validateCanBeHouseholdHead(head);
        } else {
            head = movingResidents.stream()
                    .filter(r -> clean(r.getRelationshipToHead()).equalsIgnoreCase("Head") && isActiveMember(r))
                    .findFirst()
                    .orElseGet(() -> movingResidents.stream().filter(this::isActiveMember).findFirst().orElse(null));
        }
        if (head != null) {
            setHouseholdHead(target, head, actor, "Household split");
        }
        if (oldSourceHead != null && movingResidents.stream().anyMatch(r -> Objects.equals(r.getId(), oldSourceHead.getId()))) {
            Resident replacementSourceHead = residentRepository.findByHouseholdIdAndArchivedFalse(source.getId())
                    .stream()
                    .filter(this::isActiveMember)
                    .findFirst()
                    .orElse(null);
            if (replacementSourceHead != null) {
                setHouseholdHead(source, replacementSourceHead, actor, "Household split");
            } else {
                source.setHeadResident(null);
                source.setNote(appendNote(source.getNote(), "Household head moved during split; choose a new head."));
                householdRepository.save(source);
            }
        }

        refreshMemberCount(source);
        refreshMemberCount(target);
        addLog(actor, "SPLIT_HOUSEHOLD", "HOUSEHOLD", source.getId(),
                "Split " + movingResidents.size() + " resident(s) to household " + target.getId());
        return toHouseholdDTO(target, true);
    }

    @Transactional
    public TemporaryResidenceDTO createTemporaryResidenceRecord(String residentId, TemporaryResidenceRequest request, String actor) {
        Resident resident = getResidentOrThrow(residentId);
        ResidenceRecordType type = parseResidenceRecordType(request.getType());
        TemporaryResidenceRecord record = TemporaryResidenceRecord.builder()
                .id("TRR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT))
                .resident(resident)
                .type(type)
                .address(clean(request.getAddress()))
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .reason(clean(request.getReason()))
                .actor(clean(actor).isBlank() ? "system" : clean(actor))
                .build();
        TemporaryResidenceRecord saved = temporaryResidenceRecordRepository.save(record);

        if (type == ResidenceRecordType.TEMPORARY_RESIDENCE) {
            resident.setStatus(ResidentStatus.TEMPORARY);
        } else if (type == ResidenceRecordType.TEMPORARY_ABSENCE) {
            resident.setStatus(ResidentStatus.TEMPORARILY_AWAY);
        } else if (type == ResidenceRecordType.PERMANENT_REGISTRATION) {
            resident.setStatus(ResidentStatus.PERMANENT);
        }
        residentRepository.save(resident);
        refreshMemberCount(resident.getHousehold());
        addLog(actor, type.name(), "RESIDENT", residentId,
                "Created residence record for " + resident.getFullName());
        return toTemporaryResidenceDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<TemporaryResidenceDTO> getTemporaryResidenceRecords(String residentId) {
        return temporaryResidenceRecordRepository.findByResidentIdOrderByCreatedAtDesc(residentId)
                .stream()
                .map(this::toTemporaryResidenceDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResidentStatsDTO getStats() {
        return ResidentStatsDTO.builder()
                .totalHouseholds(householdRepository.countByArchivedFalse())
                .totalResidents(residentRepository.countCurrentHouseholdMembers())
                .occupiedHouseholds(householdRepository.countByStatusAndArchivedFalse(HouseholdStatus.OCCUPIED))
                .vacantHouseholds(householdRepository.countByStatusAndArchivedFalse(HouseholdStatus.VACANT))
                .permanentResidents(residentRepository.countByStatusAndArchivedFalse(ResidentStatus.PERMANENT))
                .temporaryResidents(residentRepository.countByStatusAndArchivedFalse(ResidentStatus.TEMPORARY))
                .temporarilyAwayResidents(residentRepository.countByStatusAndArchivedFalse(ResidentStatus.TEMPORARILY_AWAY))
                .movedOutResidents(residentRepository.countByStatusAndArchivedFalse(ResidentStatus.MOVED_OUT))
                .deceasedResidents(residentRepository.countByStatusAndArchivedFalse(ResidentStatus.DECEASED))
                .archivedResidents(residentRepository.countByArchivedTrue())
                .build();
    }

    @Transactional(readOnly = true)
    public List<DemographicsTrendDTO> getDemographicsTrend(int year) {
        List<DemographicsTrendDTO> list = new ArrayList<>();

        long[] newRes = new long[13];
        long[] tempAbs = new long[13];
        long[] tempRes = new long[13];

        List<Object[]> resRows = residentRepository.countNewResidentsByMonth(year);
        for (Object[] row : resRows) {
            int month = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            if (month >= 1 && month <= 12) {
                newRes[month] = count;
            }
        }

        List<TemporaryResidenceRecord> records = temporaryResidenceRecordRepository.findAll();
        for (TemporaryResidenceRecord tr : records) {
            if (tr.getCreatedAt() != null && tr.getCreatedAt().getYear() == year) {
                int m = tr.getCreatedAt().getMonthValue();
                if (m >= 1 && m <= 12) {
                    if (tr.getType() == ResidenceRecordType.TEMPORARY_ABSENCE) {
                        tempAbs[m]++;
                    } else if (tr.getType() == ResidenceRecordType.TEMPORARY_RESIDENCE) {
                        tempRes[m]++;
                    }
                }
            }
        }

        for (int m = 1; m <= 12; m++) {
            list.add(DemographicsTrendDTO.builder()
                    .month(m)
                    .newResidents(newRes[m])
                    .temporaryAbsences(tempAbs[m])
                    .temporaryResidences(tempRes[m])
                    .build());
        }

        return list;
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
                .filter(household -> !household.isArchived())
                .map(household -> toHouseholdDTO(household, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ResidentDTO> getAllResidentsForExport() {
        return residentRepository.findAll(Sort.by("fullName")).stream()
                .filter(resident -> !resident.isArchived())
                .map(this::toResidentDTO)
                .toList();
    }

    private Household createHouseholdEntity(HouseholdRequest request, String actor, boolean logCreate) {
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
                .membersCount(0)
                .build();
        applyHouseholdFields(household, request);
        Household saved = householdRepository.save(household);
        if (logCreate) {
            addLog(actor, "CREATE", "HOUSEHOLD", saved.getId(),
                    "Created household " + saved.getId() + " for apartment " + saved.getApartmentNo());
        }
        return saved;
    }

    private void applyHouseholdFields(Household household, HouseholdRequest request) {
        if (request.getFloor() != null && request.getFloor() < 0) {
            throw new RuntimeException("Floor must be zero or greater.");
        }
        if (request.getArea() <= 0) {
            throw new RuntimeException("Area must be greater than 0.");
        }
        if (request.getMotorcycleCount() < 0 || request.getCarCount() < 0) {
            throw new RuntimeException("Vehicle counts must be zero or greater.");
        }

        household.setApartmentNo(clean(request.getApartmentNo()));
        household.setFloor(request.getFloor());
        household.setArea(request.getArea());
        household.setOwnerName(clean(request.getHeadName()));
        household.setPhone(VietnamDataRules.optionalVietnamMobile(request.getPhone(), "Phone"));
        household.setHouseNo(clean(request.getHouseNo()));
        household.setStreet(clean(request.getStreet()));
        household.setWard(clean(request.getWard()));
        household.setDistrict(clean(request.getDistrict()));
        household.setRegistrationDate(VietnamDataRules.notFuture(request.getRegistrationDate(), "Registration date"));
        household.setStatus(parseHouseholdStatusOrDefault(request.getStatus()));
        household.setNote(clean(request.getNote()));
        household.setMotorcycleCount(request.getMotorcycleCount());
        household.setCarCount(request.getCarCount());
    }

    private void applyResidentFields(Resident resident, ResidentRequest request) {
        ResidentStatus status = parseResidentStatus(request.getStatus());
        if (status == null) {
            status = resident.getStatus() == null ? ResidentStatus.PERMANENT : resident.getStatus();
        }
        boolean alive = request.getAlive() == null ? resident.isAlive() : request.getAlive();
        LocalDate dateOfDeath = request.getDateOfDeath() == null ? resident.getDateOfDeath() : request.getDateOfDeath();
        if (status == ResidentStatus.DECEASED) {
            alive = false;
            if (dateOfDeath == null) {
                dateOfDeath = LocalDate.now();
            }
        } else if (!alive) {
            status = ResidentStatus.DECEASED;
        } else {
            dateOfDeath = null;
        }
        VietnamDataRules.validateResidentDates(request.getDateOfBirth(), request.getIssueDate(), alive, dateOfDeath);

        resident.setFullName(VietnamDataRules.requireText(request.getFullName(), "Full name"));
        resident.setGender(clean(request.getGender()));
        resident.setDateOfBirth(request.getDateOfBirth());
        resident.setIdentityNo(VietnamDataRules.requireCitizenId(request.getIdentityNo(), "Citizen ID"));
        resident.setPhone(VietnamDataRules.optionalVietnamMobile(request.getPhone(), "Phone"));
        resident.setAlias(clean(request.getAlias()));
        resident.setBirthPlace(clean(request.getBirthPlace()));
        resident.setHometown(clean(request.getHometown()));
        resident.setEthnicity(clean(request.getEthnicity()));
        resident.setReligion(clean(request.getReligion()));
        resident.setOccupation(clean(request.getOccupation()));
        resident.setWorkplace(clean(request.getWorkplace()));
        resident.setIssueDate(request.getIssueDate());
        resident.setIssuePlace(clean(request.getIssuePlace()));
        resident.setPreviousResidence(clean(request.getPreviousResidence()));
        resident.setRelationshipToHead(clean(request.getRelationshipToHead()));
        resident.setStatus(status);
        resident.setAlive(alive);
        resident.setDateOfDeath(dateOfDeath);
    }

    private void assignHeadIfRequested(Household household, String headIdentityNo, String actor, String action) {
        String identity = VietnamDataRules.optionalCitizenId(headIdentityNo, "Head Citizen ID");
        if (identity == null) {
            return;
        }
        if (household.getStatus() == HouseholdStatus.VACANT) {
            throw new RuntimeException("Vacant households cannot have a household head.");
        }
        Resident resident = residentRepository.findByIdentityNoIgnoreCase(identity)
                .orElseThrow(() -> new RuntimeException("Household head was not found by Citizen ID."));
        validateCanBeHouseholdHead(resident);
        resident.setHousehold(household);
        resident.setArchived(false);
        residentRepository.save(resident);
        setHouseholdHead(household, resident, actor, action);
    }

    private void validateCanBeHouseholdHead(Resident resident) {
        if (resident == null || resident.isArchived()) {
            throw new RuntimeException("Archived residents cannot be household head.");
        }
        if (!resident.isAlive() || resident.getStatus() == ResidentStatus.DECEASED) {
            throw new RuntimeException("Deceased residents cannot be household head.");
        }
        if (resident.getStatus() == ResidentStatus.MOVED_OUT) {
            throw new RuntimeException("Moved-out residents cannot be household head.");
        }
    }

    private void validateVacantHouseholdState(Household household, String headIdentityNo) {
        if (household.getStatus() != HouseholdStatus.VACANT) {
            return;
        }
        if (residentRepository.countActiveMembers(household.getId()) > 0) {
            throw new RuntimeException("Cannot mark a household as vacant while it still has active residents.");
        }
        if (trimToNull(headIdentityNo) != null) {
            throw new RuntimeException("Vacant households cannot have a household head.");
        }
        household.setHeadResident(null);
        household.setMembersCount(0);
    }

    private void enforceHouseholdHeadIfNeeded(Resident resident, String actor) {
        Household household = resident.getHousehold();
        if (household == null || resident.isArchived() || resident.getStatus() == ResidentStatus.DECEASED || !resident.isAlive()) {
            return;
        }
        if (clean(resident.getRelationshipToHead()).equalsIgnoreCase("Head")) {
            setHouseholdHead(household, resident, actor, "SYNC_HEAD");
        } else if (isCurrentHead(household, resident)) {
            household.setHeadResident(null);
            householdRepository.save(household);
        }
    }

    private void setHouseholdHead(Household household, Resident newHead, String actor, String reason) {
        if (household.getStatus() == HouseholdStatus.VACANT) {
            throw new RuntimeException("Vacant households cannot have a household head.");
        }
        validateCanBeHouseholdHead(newHead);
        residentRepository.findByHouseholdIdAndArchivedFalse(household.getId()).forEach(member -> {
            if (!Objects.equals(member.getId(), newHead.getId())
                    && clean(member.getRelationshipToHead()).equalsIgnoreCase("Head")) {
                member.setRelationshipToHead("Member");
                residentRepository.save(member);
            }
        });
        newHead.setRelationshipToHead("Head");
        newHead.setHousehold(household);
        newHead.setArchived(false);
        residentRepository.save(newHead);

        household.setHeadResident(newHead);
        household.setOwnerName(newHead.getFullName());
        if (trimToNull(household.getPhone()) == null) {
            household.setPhone(newHead.getPhone());
        }
        householdRepository.save(household);
        addLog(actor, "CHANGE_HEAD", "HOUSEHOLD", household.getId(),
                "Changed household head to " + newHead.getFullName()
                        + (clean(reason).isBlank() ? "" : " (" + clean(reason) + ")"));
    }

    private Household getHouseholdOrThrow(String id) {
        return householdRepository.findById(id)
                .filter(household -> !household.isArchived())
                .orElseThrow(() -> new RuntimeException("Household not found."));
    }

    private Resident getResidentOrThrow(String id) {
        return residentRepository.findById(id)
                .filter(resident -> !resident.isArchived())
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
        household.setMembersCount((int) residentRepository.countActiveMembers(household.getId()));
        householdRepository.save(household);
    }

    private void refreshMemberCountById(String householdId) {
        if (householdId == null || householdId.isBlank()) {
            return;
        }
        householdRepository.findById(householdId).ifPresent(this::refreshMemberCount);
    }

    private HouseholdDTO toHouseholdDTO(Household household, boolean includeMembers) {
        boolean vacant = household.getStatus() == HouseholdStatus.VACANT;
        List<ResidentDTO> members = includeMembers && !vacant
                ? residentRepository.findByHouseholdIdAndArchivedFalseOrderByFullNameAsc(household.getId())
                        .stream()
                        .map(this::toResidentDTO)
                        .toList()
                : null;
        Resident head = household.getHeadResident();
        int activeMemberCount = vacant
                ? 0
                : (int) residentRepository.countActiveMembers(household.getId());
        boolean headChangeRequired = !vacant && (head == null
                || head.isArchived()
                || !head.isAlive()
                || head.getStatus() == ResidentStatus.DECEASED
                || head.getStatus() == ResidentStatus.MOVED_OUT);

        return HouseholdDTO.builder()
                .id(household.getId())
                .code(household.getId())
                .apartmentNo(nullSafe(household.getApartmentNo()))
                .floor(household.getFloor())
                .area(household.getArea())
                .ownerName(household.getOwnerName())
                .headName(household.getOwnerName())
                .headResidentId(head == null ? "" : head.getId())
                .headIdentityNo(head == null ? "" : head.getIdentityNo())
                .phone(nullSafe(household.getPhone()))
                .houseNo(nullSafe(household.getHouseNo()))
                .street(nullSafe(household.getStreet()))
                .ward(nullSafe(household.getWard()))
                .district(nullSafe(household.getDistrict()))
                .registrationDate(household.getRegistrationDate())
                .status(household.getStatus() == null ? HouseholdStatus.OCCUPIED.name() : household.getStatus().name())
                .note(nullSafe(household.getNote()))
                .memberCount(activeMemberCount)
                .membersCount(activeMemberCount)
                .activeMemberCount(activeMemberCount)
                .motorcycleCount(household.getMotorcycleCount())
                .carCount(household.getCarCount())
                .previousOwnerName(nullSafe(household.getPreviousOwnerName()))
                .ownershipTransferredAt(household.getOwnershipTransferredAt())
                .ownershipNote(nullSafe(household.getOwnershipNote()))
                .headChangeRequired(headChangeRequired)
                .archived(household.isArchived())
                .archivedAt(household.getArchivedAt())
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
                .alias(nullSafe(resident.getAlias()))
                .birthPlace(nullSafe(resident.getBirthPlace()))
                .hometown(nullSafe(resident.getHometown()))
                .ethnicity(nullSafe(resident.getEthnicity()))
                .religion(nullSafe(resident.getReligion()))
                .occupation(nullSafe(resident.getOccupation()))
                .workplace(nullSafe(resident.getWorkplace()))
                .issueDate(resident.getIssueDate())
                .issuePlace(nullSafe(resident.getIssuePlace()))
                .previousResidence(nullSafe(resident.getPreviousResidence()))
                .relationshipToHead(nullSafe(resident.getRelationshipToHead()))
                .status(resident.getStatus() == null ? ResidentStatus.PERMANENT.name() : resident.getStatus().name())
                .alive(resident.isAlive())
                .dateOfDeath(resident.getDateOfDeath())
                .archived(resident.isArchived())
                .householdId(household == null ? "" : household.getId())
                .apartmentNo(household == null ? "" : nullSafe(household.getApartmentNo()))
                .householdHeadName(household == null ? "" : household.getOwnerName())
                .createdAt(resident.getCreatedAt())
                .updatedAt(resident.getUpdatedAt())
                .build();
    }

    private TemporaryResidenceDTO toTemporaryResidenceDTO(TemporaryResidenceRecord record) {
        Resident resident = record.getResident();
        return TemporaryResidenceDTO.builder()
                .id(record.getId())
                .residentId(resident.getId())
                .residentName(resident.getFullName())
                .type(record.getType().name())
                .address(nullSafe(record.getAddress()))
                .startDate(record.getStartDate())
                .endDate(record.getEndDate())
                .reason(nullSafe(record.getReason()))
                .actor(nullSafe(record.getActor()))
                .createdAt(record.getCreatedAt())
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

    private boolean isCurrentHead(Household household, Resident resident) {
        return household.getHeadResident() != null
                && Objects.equals(household.getHeadResident().getId(), resident.getId());
    }

    private boolean isActiveMember(Resident resident) {
        return resident != null
                && !resident.isArchived()
                && resident.isAlive()
                && resident.getStatus() != ResidentStatus.MOVED_OUT
                && resident.getStatus() != ResidentStatus.DECEASED;
    }

    private ChangeHouseholdHeadRequest replacementRequest(String identityNo, String reason) {
        ChangeHouseholdHeadRequest request = new ChangeHouseholdHeadRequest();
        request.setIdentityNo(identityNo);
        request.setReason(reason);
        return request;
    }

    private String appendNote(String note, String addition) {
        String cleaned = clean(note);
        return cleaned.isBlank() ? addition : cleaned + " | " + addition;
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

    private ResidenceRecordType parseResidenceRecordType(String value) {
        String cleaned = clean(value).trim().toUpperCase(Locale.ROOT);
        return ResidenceRecordType.valueOf(cleaned);
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
