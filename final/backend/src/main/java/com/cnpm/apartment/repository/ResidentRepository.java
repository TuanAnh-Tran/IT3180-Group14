package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.Resident;
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
    List<Resident> findByHouseholdId(String householdId);
    void deleteByHouseholdId(String householdId);
    Optional<Resident> findByIdentityNo(String identityNo);

    @Query("SELECT r FROM Resident r WHERE " +
           "(:status = 'ALL' OR r.status = :status) AND " +
           "(:gender = '' OR r.gender = :gender) AND " +
           "(:householdId = '' OR r.householdId = :householdId) AND " +
           "(LOWER(r.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(COALESCE(r.identityNo, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(COALESCE(r.phone, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(COALESCE(r.hometown, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(COALESCE(r.occupation, '')) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Resident> searchResidents(@Param("status") String status, 
                                   @Param("gender") String gender, 
                                   @Param("householdId") String householdId, 
                                   @Param("search") String search, 
                                   Pageable pageable);
}
