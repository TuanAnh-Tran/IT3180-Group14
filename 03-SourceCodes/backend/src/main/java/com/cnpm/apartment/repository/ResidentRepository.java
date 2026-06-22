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

    long countByHouseholdId(String householdId);

    long countByStatus(String status);

    boolean existsByIdentityNoAndIdNot(String identityNo, String id);

    boolean existsByIdentityNo(String identityNo);

    Optional<Resident> findByIdentityNo(String identityNo);

    @Query("SELECT r FROM Resident r WHERE " +
           "(:status = 'ALL' OR r.status = :status) AND " +
           "(:gender IS NULL OR :gender = '' OR r.gender = :gender) AND " +
           "(:householdId IS NULL OR :householdId = '' OR r.householdId = :householdId) AND " +
           "(COALESCE(:search, '') = '' OR " +
           "LOWER(r.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.identityNo) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.phone) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.hometown) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.occupation) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Resident> searchResidents(@Param("search") String search,
                                   @Param("status") String status,
                                   @Param("gender") String gender,
                                   @Param("householdId") String householdId,
                                   Pageable pageable);

    @Query("SELECT r FROM Resident r WHERE " +
           "(COALESCE(:search, '') = '' OR " +
           "LOWER(r.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.identityNo) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.phone) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.hometown) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.occupation) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Resident> searchGlobal(@Param("search") String search);
}
