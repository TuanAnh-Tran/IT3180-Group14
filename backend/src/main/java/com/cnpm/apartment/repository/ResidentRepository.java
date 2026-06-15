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

@Repository
public interface ResidentRepository extends JpaRepository<Resident, String> {
    boolean existsByIdentityNoIgnoreCase(String identityNo);

    boolean existsByIdentityNoIgnoreCaseAndIdNot(String identityNo, String id);

    long countByHouseholdId(String householdId);

    long countByStatus(ResidentStatus status);

    List<Resident> findByHouseholdIdOrderByFullNameAsc(String householdId);

    @Query("""
            SELECT r FROM Resident r
            LEFT JOIN r.household h
            WHERE (:status IS NULL OR r.status = :status)
              AND (:gender IS NULL OR :gender = '' OR LOWER(COALESCE(r.gender, '')) = LOWER(:gender))
              AND (:householdId IS NULL OR :householdId = '' OR h.id = :householdId)
              AND (:search IS NULL OR :search = ''
                   OR LOWER(r.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(r.identityNo) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(r.phone, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(r.hometown, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(r.occupation, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(h.apartmentNo, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(h.ownerName, '')) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<Resident> search(
            @Param("search") String search,
            @Param("status") ResidentStatus status,
            @Param("gender") String gender,
            @Param("householdId") String householdId,
            Pageable pageable);
}
