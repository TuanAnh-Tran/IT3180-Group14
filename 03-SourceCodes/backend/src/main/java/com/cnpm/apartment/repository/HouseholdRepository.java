package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.Household;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface HouseholdRepository extends JpaRepository<Household, String> {

    @Query("SELECT h FROM Household h WHERE " +
           "(:status = 'ALL' OR h.status = :status) AND " +
           "(COALESCE(:search, '') = '' OR " +
           "LOWER(h.id) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(h.apartmentNo) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(h.ownerName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(h.phone) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(h.status) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Household> searchHouseholds(@Param("search") String search, 
                                     @Param("status") String status, 
                                     Pageable pageable);

    boolean existsByApartmentNoAndIdNot(String apartmentNo, String id);
    
    boolean existsByApartmentNo(String apartmentNo);

    long countByStatus(String status);
}
