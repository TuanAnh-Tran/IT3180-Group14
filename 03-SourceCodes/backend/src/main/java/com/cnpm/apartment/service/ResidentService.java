package com.cnpm.apartment.service;

import com.cnpm.apartment.model.ActivityLog;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Resident;
import com.cnpm.apartment.repository.ActivityLogRepository;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.ResidentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResidentService {

    private final ResidentRepository residentRepository;
    private final HouseholdRepository householdRepository;
    private final ActivityLogRepository activityLogRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> loadStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalHouseholds", householdRepository.count());
        stats.put("totalResidents", residentRepository.count());
        stats.put("occupiedHouseholds", householdRepository.countByStatus("OCCUPIED"));
        stats.put("vacantHouseholds", householdRepository.countByStatus("VACANT"));
        stats.put("permanentResidents", residentRepository.countByStatus("PERMANENT"));
        stats.put("temporaryResidents", residentRepository.countByStatus("TEMPORARY"));
        stats.put("temporarilyAwayResidents", residentRepository.countByStatus("TEMPORARILY_AWAY"));
        stats.put("movedOutResidents", residentRepository.countByStatus("MOVED_OUT"));
        return stats;
    }

    @Transactional(readOnly = true)
    public Page<Household> searchHouseholds(String search, String status, Pageable pageable) {
        return householdRepository.searchHouseholds(search, status, pageable);
    }

    @Transactional(readOnly = true)
    public Household getHouseholdById(String id) {
        return householdRepository.findById(id).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Resident> getResidentsByHouseholdId(String householdId) {
        List<Resident> list = residentRepository.findByHouseholdId(householdId);
        // Enrich transient fields
        for (Resident r : list) {
            enrichResident(r);
        }
        return list;
    }

    @Transactional
    public Household saveHousehold(Household request, String actor) {
        boolean isEdit = householdRepository.existsById(request.getId());

        // Validate apartment number uniqueness
        boolean apartmentExists;
        if (isEdit) {
            apartmentExists = householdRepository.existsByApartmentNoAndIdNot(request.getApartmentNo(), request.getId());
        } else {
            apartmentExists = householdRepository.existsByApartmentNo(request.getApartmentNo());
        }
        if (apartmentExists) {
            throw new IllegalArgumentException("Apartment number already exists.");
        }

        Household household;
        if (isEdit) {
            household = householdRepository.findById(request.getId()).orElseThrow();
            household.setApartmentNo(request.getApartmentNo());
            household.setFloor(request.getFloor());
            household.setArea(request.getArea());
            household.setOwnerName(request.getOwnerName());
            household.setPhone(request.getPhone());
            household.setStatus(request.getStatus());
            household.setNote(request.getNote());
            // keep membersCount, motorcycleCount, carCount
        } else {
            household = Household.builder()
                    .id(request.getId())
                    .apartmentNo(request.getApartmentNo())
                    .floor(request.getFloor())
                    .area(request.getArea())
                    .ownerName(request.getOwnerName())
                    .phone(request.getPhone())
                    .status(request.getStatus())
                    .note(request.getNote())
                    .membersCount(0)
                    .motorcycleCount(0)
                    .carCount(0)
                    .build();
        }

        Household saved = householdRepository.save(household);

        // Save activity log
        logActivity(
                actor,
                isEdit ? "UPDATE" : "CREATE",
                "HOUSEHOLD",
                saved.getId(),
                (isEdit ? "Updated" : "Created") + " household " + saved.getId()
        );

        return saved;
    }

    @Transactional
    public void deleteHousehold(String id, String actor) {
        Household household = householdRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Household not found."));

        long residentsCount = residentRepository.countByHouseholdId(id);
        if (residentsCount > 0) {
            throw new IllegalArgumentException("Cannot delete a household that still has residents.");
        }

        householdRepository.delete(household);

        logActivity(
                actor,
                "DELETE",
                "HOUSEHOLD",
                id,
                "Deleted household " + id
        );
    }

    @Transactional(readOnly = true)
    public Page<Resident> searchResidents(String search, String status, String gender, String householdId, Pageable pageable) {
        Page<Resident> page = residentRepository.searchResidents(search, status, gender, householdId, pageable);
        page.forEach(this::enrichResident);
        return page;
    }

    @Transactional(readOnly = true)
    public Resident getResidentById(String id) {
        Resident r = residentRepository.findById(id).orElse(null);
        if (r != null) {
            enrichResident(r);
        }
        return r;
    }

    @Transactional
    public Resident saveResident(Resident request, String actor) {
        boolean isEdit = request.getId() != null && residentRepository.existsById(request.getId());

        // Validate identityNo uniqueness
        boolean identityExists;
        String residentId = request.getId();
        if (isEdit) {
            identityExists = residentRepository.existsByIdentityNoAndIdNot(request.getIdentityNo(), residentId);
        } else {
            identityExists = residentRepository.existsByIdentityNo(request.getIdentityNo());
            if (residentId == null || residentId.trim().isEmpty()) {
                residentId = "RES-" + Long.toString(System.currentTimeMillis(), 36).toUpperCase();
            }
        }
        if (identityExists) {
            throw new IllegalArgumentException("Citizen ID already exists.");
        }

        String oldHouseholdId = null;
        Resident resident;
        if (isEdit) {
            resident = residentRepository.findById(residentId).orElseThrow();
            oldHouseholdId = resident.getHouseholdId();

            resident.setFullName(request.getFullName());
            resident.setGender(request.getGender());
            resident.setDateOfBirth(request.getDateOfBirth());
            resident.setIdentityNo(request.getIdentityNo());
            resident.setPhone(request.getPhone());
            resident.setHometown(request.getHometown());
            resident.setOccupation(request.getOccupation());
            resident.setRelationshipToHead(request.getRelationshipToHead());
            resident.setStatus(request.getStatus());
            resident.setHouseholdId(request.getHouseholdId());
        } else {
            resident = Resident.builder()
                    .id(residentId)
                    .fullName(request.getFullName())
                    .gender(request.getGender())
                    .dateOfBirth(request.getDateOfBirth())
                    .identityNo(request.getIdentityNo())
                    .phone(request.getPhone())
                    .hometown(request.getHometown())
                    .occupation(request.getOccupation())
                    .relationshipToHead(request.getRelationshipToHead())
                    .status(request.getStatus())
                    .householdId(request.getHouseholdId())
                    .build();
        }

        Resident saved = residentRepository.save(resident);

        // Sync members counts
        syncHouseholdMembersCount(saved.getHouseholdId());
        if (oldHouseholdId != null && !oldHouseholdId.equals(saved.getHouseholdId())) {
            syncHouseholdMembersCount(oldHouseholdId);
        }

        logActivity(
                actor,
                isEdit ? "UPDATE" : "CREATE",
                "RESIDENT",
                saved.getId(),
                (isEdit ? "Updated" : "Created") + " resident " + saved.getFullName()
        );

        enrichResident(saved);
        return saved;
    }

    @Transactional
    public void deleteResident(String id, String actor) {
        Resident resident = residentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resident not found."));

        String householdId = resident.getHouseholdId();

        residentRepository.delete(resident);

        // Sync members count
        syncHouseholdMembersCount(householdId);

        logActivity(
                actor,
                "DELETE",
                "RESIDENT",
                id,
                "Deleted resident " + resident.getFullName()
        );
    }

    @Transactional
    public Resident addMember(String householdId, String residentId, String actor) {
        Resident resident = residentRepository.findById(residentId)
                .orElseThrow(() -> new RuntimeException("Resident not found."));

        String oldHouseholdId = resident.getHouseholdId();
        resident.setHouseholdId(householdId);
        Resident saved = residentRepository.save(resident);

        syncHouseholdMembersCount(householdId);
        if (oldHouseholdId != null && !oldHouseholdId.equals(householdId)) {
            syncHouseholdMembersCount(oldHouseholdId);
        }

        logActivity(
                actor,
                "ADD_MEMBER",
                "HOUSEHOLD",
                householdId,
                "Added " + resident.getFullName() + " to " + householdId
        );

        enrichResident(saved);
        return saved;
    }

    @Transactional
    public Resident removeMember(String householdId, String residentId, String actor) {
        Resident resident = residentRepository.findById(residentId)
                .orElseThrow(() -> new RuntimeException("Resident not found."));

        if (resident.getHouseholdId() == null || !resident.getHouseholdId().equals(householdId)) {
            throw new IllegalArgumentException("Resident is not a member of this household.");
        }

        resident.setHouseholdId(null);
        Resident saved = residentRepository.save(resident);

        syncHouseholdMembersCount(householdId);

        logActivity(
                actor,
                "REMOVE_MEMBER",
                "HOUSEHOLD",
                householdId,
                "Removed " + resident.getFullName() + " from " + householdId
        );

        enrichResident(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> globalSearch(String query, String type) {
        List<Map<String, Object>> results = new ArrayList<>();
        String normalizedQuery = query != null ? query.trim().toLowerCase() : "";

        boolean searchAll = "all".equalsIgnoreCase(type);
        boolean searchResident = "resident".equalsIgnoreCase(type) || searchAll;
        boolean searchHousehold = "household".equalsIgnoreCase(type) || searchAll;

        if (searchResident) {
            List<Resident> residents = residentRepository.searchGlobal(normalizedQuery);
            for (Resident r : residents) {
                enrichResident(r);
                Map<String, Object> map = new HashMap<>();
                map.put("type", "Resident");
                map.put("id", r.getId());
                map.put("mainInfo", r.getFullName() + " - " + r.getIdentityNo());
                map.put("detail", "Phone: " + (r.getPhone() != null ? r.getPhone() : "-") + 
                                  " | Apartment: " + (r.getApartmentNo() != null && !r.getApartmentNo().isEmpty() ? r.getApartmentNo() : "No household") + 
                                  " | " + r.getStatus());
                results.add(map);
            }
        }

        if (searchHousehold) {
            List<Household> households = householdRepository.findAll();
            for (Household h : households) {
                String matchStr = (h.getId() + " " + (h.getApartmentNo() != null ? h.getApartmentNo() : "") + " " + 
                                   h.getOwnerName() + " " + (h.getPhone() != null ? h.getPhone() : "") + " " + h.getStatus()).toLowerCase();
                if (normalizedQuery.isEmpty() || matchStr.contains(normalizedQuery)) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("type", "Household");
                    map.put("id", h.getId());
                    map.put("mainInfo", h.getId() + " - " + (h.getApartmentNo() != null ? h.getApartmentNo() : "-"));
                    map.put("detail", "Head: " + h.getOwnerName() + " | Members: " + h.getMembersCount() + " | " + h.getStatus());
                    results.add(map);
                }
            }
        }

        if (results.size() > 20) {
            return results.subList(0, 20);
        }
        return results;
    }

    @Transactional(readOnly = true)
    public List<ActivityLog> loadActivity(int limit) {
        return activityLogRepository.findRecentLogs(PageRequest.of(0, limit));
    }

    private void enrichResident(Resident r) {
        if (r.getHouseholdId() != null && !r.getHouseholdId().isEmpty()) {
            householdRepository.findById(r.getHouseholdId()).ifPresent(h -> {
                r.setApartmentNo(h.getApartmentNo());
                r.setHouseholdHeadName(h.getOwnerName());
            });
        } else {
            r.setApartmentNo("");
            r.setHouseholdHeadName("");
        }
    }

    private void syncHouseholdMembersCount(String householdId) {
        if (householdId == null || householdId.isEmpty()) return;
        householdRepository.findById(householdId).ifPresent(h -> {
            int count = (int) residentRepository.countByHouseholdId(householdId);
            h.setMembersCount(count);
            householdRepository.save(h);
        });
    }

    private void logActivity(String actor, String action, String targetType, String targetId, String detail) {
        String logActor = actor != null && !actor.trim().isEmpty() ? actor : "system";
        ActivityLog activityLog = ActivityLog.builder()
                .id("RAL-" + Long.toString(System.currentTimeMillis(), 36).toUpperCase())
                .actor(logActor)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .detail(detail)
                .createdAt(LocalDateTime.now())
                .build();
        activityLogRepository.save(activityLog);
    }
}
