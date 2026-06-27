package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.Resident;
import com.cnpm.apartment.model.enums.ResidentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResidentRepository extends JpaRepository<Resident, String> {
    boolean existsByIdentityNoIgnoreCase(String identityNo);

    boolean existsByIdentityNoIgnoreCaseAndIdNot(String identityNo, String id);

    Optional<Resident> findByIdentityNoIgnoreCase(String identityNo);

    long countByHouseholdIdAndArchivedFalse(String householdId);

    long countByArchivedFalse();

    long countByArchivedTrue();

    long countByStatusAndArchivedFalse(ResidentStatus status);

    List<Resident> findByHouseholdIdAndArchivedFalseOrderByFullNameAsc(String householdId);

    List<Resident> findByHouseholdIdAndArchivedFalse(String householdId);

    @Query("""
            SELECT COUNT(r) FROM Resident r
            WHERE r.archived = false
              AND r.household.id = :householdId
              AND r.alive = true
              AND r.status <> com.cnpm.apartment.model.enums.ResidentStatus.MOVED_OUT
              AND r.status <> com.cnpm.apartment.model.enums.ResidentStatus.DECEASED
            """)
    long countActiveMembers(@Param("householdId") String householdId);

    @Query("""
            SELECT COUNT(r) FROM Resident r
            WHERE r.archived = false
              AND r.household IS NOT NULL
              AND r.alive = true
              AND r.status <> com.cnpm.apartment.model.enums.ResidentStatus.MOVED_OUT
              AND r.status <> com.cnpm.apartment.model.enums.ResidentStatus.DECEASED
            """)
    long countCurrentHouseholdMembers();

    @Query("""
            SELECT r FROM Resident r
            LEFT JOIN r.household h
            WHERE r.archived = false
              AND (:status IS NULL OR r.status = :status)
              AND (:gender IS NULL OR :gender = '' OR LOWER(COALESCE(r.gender, '')) = LOWER(:gender))
              AND (:householdId IS NULL OR :householdId = '' OR h.id = :householdId)
              AND (:search IS NULL OR :search = ''
                   OR LOWER(r.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(r.identityNo) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(r.alias, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(r.phone, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(r.birthPlace, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(r.hometown, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(r.ethnicity, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(r.occupation, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(r.workplace, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(h.apartmentNo, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(h.ownerName, '')) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<Resident> search(
            @Param("search") String search,
            @Param("status") ResidentStatus status,
            @Param("gender") String gender,
            @Param("householdId") String householdId,
            Pageable pageable);

    @Query("SELECT MONTH(r.createdAt) as month, COUNT(r) FROM Resident r WHERE YEAR(r.createdAt) = :year GROUP BY MONTH(r.createdAt)")
    List<Object[]> countNewResidentsByMonth(@Param("year") int year);
}
