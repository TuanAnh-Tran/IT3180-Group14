package com.cnpm.apartment.service;

import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Resident;
import com.cnpm.apartment.model.ActivityLog;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.ResidentRepository;
import com.cnpm.apartment.repository.ActivityLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResidentService {

    private final HouseholdRepository householdRepository;
    private final ResidentRepository residentRepository;
    private final ActivityLogRepository activityLogRepository;
    private final ObjectMapper objectMapper;

    private String toJson(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{\"error\":\"Serialization failed: " + e.getMessage() + "\"}";
        }
    }

    private void logActivity(String action, String targetType, String targetId, String detail, String dataBefore, String dataAfter) {
        String actor = "system";
        try {
            org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                actor = auth.getName();
            }
        } catch (Exception e) {
            // Ignore, default to system
        }

        ActivityLog log = ActivityLog.builder()
                .id("ACT-" + UUID.randomUUID().toString())
                .actor(actor)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .detail(detail)
                .dataBefore(dataBefore)
                .dataAfter(dataAfter)
                .build();
        activityLogRepository.save(log);
    }

    public Map<String, Object> getStats() {
        long totalHouseholds = householdRepository.count();
        long totalResidents = residentRepository.count();

        // Occupied / Vacant
        long occupiedHouseholds = householdRepository.findAll().stream()
                .filter(h -> "OCCUPIED".equalsIgnoreCase(h.getStatus())).count();
        long vacantHouseholds = householdRepository.findAll().stream()
                .filter(h -> "VACANT".equalsIgnoreCase(h.getStatus())).count();

        // Residents statuses
        long permanent = residentRepository.findAll().stream()
                .filter(r -> "PERMANENT".equalsIgnoreCase(r.getStatus())).count();
        long temporary = residentRepository.findAll().stream()
                .filter(r -> "TEMPORARY".equalsIgnoreCase(r.getStatus())).count();
        long temporarilyAway = residentRepository.findAll().stream()
                .filter(r -> "TEMPORARILY_AWAY".equalsIgnoreCase(r.getStatus())).count();
        long movedOut = residentRepository.findAll().stream()
                .filter(r -> "MOVED_OUT".equalsIgnoreCase(r.getStatus())).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalHouseholds", totalHouseholds);
        stats.put("totalResidents", totalResidents);
        stats.put("occupiedHouseholds", occupiedHouseholds);
        stats.put("vacantHouseholds", vacantHouseholds);
        stats.put("permanentResidents", permanent);
        stats.put("temporaryResidents", temporary);
        stats.put("temporarilyAwayResidents", temporarilyAway);
        stats.put("movedOutResidents", movedOut);

        return stats;
    }

    public Page<Household> getHouseholds(String status, String search, Pageable pageable) {
        return householdRepository.searchHouseholds(status, search, pageable);
    }

    public Page<Resident> getResidents(String status, String gender, String householdId, String search, Pageable pageable) {
        return residentRepository.searchResidents(status, gender, householdId, search, pageable);
    }

    public Optional<Household> getHousehold(String id) {
        return householdRepository.findById(id);
    }

    public Optional<Resident> getResident(String id) {
        return residentRepository.findById(id);
    }

    public List<Resident> getHouseholdMembers(String householdId) {
        return residentRepository.findByHouseholdId(householdId);
    }

    @Transactional
    public Household saveHousehold(Household household) {
        String hhId = household.getId();
        boolean isEdit = householdRepository.existsById(hhId);
        
        String dataBefore = null;
        if (isEdit) {
            Household existing = householdRepository.findById(hhId).orElse(null);
            dataBefore = toJson(existing);
            
            // Recalculate member count
            int count = residentRepository.findByHouseholdId(hhId).size();
            household.setMembersCount(count);
        } else {
            household.setMembersCount(0);
        }
        
        Household saved = householdRepository.save(household);
        String dataAfter = toJson(saved);
        
        String action = isEdit ? "UPDATE" : "CREATE";
        String detail = isEdit ? "Updated household: " + hhId : "Created household: " + hhId;
        logActivity(action, "Household", hhId, detail, dataBefore, dataAfter);
        
        return saved;
    }

    @Transactional
    public void deleteHousehold(String id) {
        List<Resident> members = residentRepository.findByHouseholdId(id);
        if (!members.isEmpty()) {
            throw new RuntimeException("Cannot delete a household that still has residents.");
        }
        
        Household existing = householdRepository.findById(id).orElse(null);
        String dataBefore = toJson(existing);
        
        householdRepository.deleteById(id);
        
        logActivity("DELETE", "Household", id, "Deleted household: " + id, dataBefore, null);
    }

    @Transactional
    public Resident saveResident(Resident resident) {
        // Enforce identity uniqueness check
        if (resident.getIdentityNo() != null && !resident.getIdentityNo().trim().isEmpty()) {
            Optional<Resident> existing = residentRepository.findAll().stream()
                    .filter(r -> resident.getIdentityNo().trim().equalsIgnoreCase(r.getIdentityNo()) && !r.getId().equals(resident.getId()))
                    .findFirst();
            if (existing.isPresent()) {
                throw new RuntimeException("Citizen ID (CCCD) already exists.");
            }
        }
        
        String resId = resident.getId();
        boolean isEdit = resId != null && residentRepository.existsById(resId);
        
        String dataBefore = null;
        if (isEdit) {
            Resident existing = residentRepository.findById(resId).orElse(null);
            dataBefore = toJson(existing);
        }
        
        Resident saved = residentRepository.save(resident);
        String dataAfter = toJson(saved);
        
        if (saved.getHouseholdId() != null && !saved.getHouseholdId().isEmpty()) {
            updateHouseholdMemberCount(saved.getHouseholdId());
        }
        
        String action = isEdit ? "UPDATE" : "CREATE";
        String detail = isEdit ? "Updated resident: " + saved.getFullName() : "Created resident: " + saved.getFullName();
        logActivity(action, "Resident", saved.getId(), detail, dataBefore, dataAfter);
        
        return saved;
    }

    @Transactional
    public void deleteResident(String id) {
        Optional<Resident> resOpt = residentRepository.findById(id);
        if (resOpt.isPresent()) {
            Resident r = resOpt.get();
            String dataBefore = toJson(r);
            
            residentRepository.deleteById(id);
            if (r.getHouseholdId() != null && !r.getHouseholdId().isEmpty()) {
                updateHouseholdMemberCount(r.getHouseholdId());
            }
            
            logActivity("DELETE", "Resident", id, "Deleted resident: " + r.getFullName(), dataBefore, null);
        }
    }

    @Transactional
    public void addMember(String householdId, String residentId) {
        Optional<Household> hhOpt = householdRepository.findById(householdId);
        Optional<Resident> resOpt = residentRepository.findById(residentId);
        if (hhOpt.isEmpty()) throw new RuntimeException("Household not found");
        if (resOpt.isEmpty()) throw new RuntimeException("Resident not found");

        Resident r = resOpt.get();
        String oldHhId = r.getHouseholdId();

        // Audit tracking
        String dataBefore = toJson(r);

        r.setHouseholdId(householdId);
        residentRepository.save(r);

        updateHouseholdMemberCount(householdId);
        if (oldHhId != null && !oldHhId.isEmpty() && !oldHhId.equals(householdId)) {
            updateHouseholdMemberCount(oldHhId);
        }

        String dataAfter = toJson(r);
        String detail = "Added resident " + r.getFullName() + " (" + residentId + ") to household " + householdId;
        logActivity("ADD_MEMBER", "Household", householdId, detail, dataBefore, dataAfter);
    }

    @Transactional
    public void removeMember(String householdId, String residentId) {
        Optional<Resident> resOpt = residentRepository.findById(residentId);
        if (resOpt.isPresent()) {
            Resident r = resOpt.get();
            if (householdId.equals(r.getHouseholdId())) {
                String dataBefore = toJson(r);
                
                r.setHouseholdId(null);
                residentRepository.save(r);
                updateHouseholdMemberCount(householdId);
                
                String dataAfter = toJson(r);
                String detail = "Removed resident " + r.getFullName() + " (" + residentId + ") from household " + householdId;
                logActivity("REMOVE_MEMBER", "Household", householdId, detail, dataBefore, dataAfter);
            }
        }
    }

    private void updateHouseholdMemberCount(String householdId) {
        Optional<Household> hhOpt = householdRepository.findById(householdId);
        if (hhOpt.isPresent()) {
            Household hh = hhOpt.get();
            int count = residentRepository.findByHouseholdId(householdId).size();
            hh.setMembersCount(count);
            householdRepository.save(hh);
        }
    }
}
