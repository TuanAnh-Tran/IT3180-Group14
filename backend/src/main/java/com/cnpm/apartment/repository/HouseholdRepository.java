package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.enums.HouseholdStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface HouseholdRepository extends JpaRepository<Household, String> {
    boolean existsByApartmentNoIgnoreCase(String apartmentNo);

    boolean existsByApartmentNoIgnoreCaseAndIdNot(String apartmentNo, String id);

    long countByStatus(HouseholdStatus status);

    @Query("""
            SELECT h FROM Household h
            WHERE (:status IS NULL OR h.status = :status)
              AND (:search IS NULL OR :search = ''
                   OR LOWER(h.id) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(h.apartmentNo, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(h.ownerName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(h.phone, '')) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<Household> search(
            @Param("search") String search,
            @Param("status") HouseholdStatus status,
            Pageable pageable);
}
