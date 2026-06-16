package com.cnpm.apartment.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Chỉ số tiêu thụ điện nước của từng hộ theo đợt.
 */
@Entity
@Table(name = "utility_record", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"household_id", "period_id", "type"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UtilityRecord {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id", nullable = false)
    private CollectionPeriod period;

    @Column(name = "type", nullable = false, length = 50)
    private String type;

    @Column(name = "old_index", nullable = false)
    private int oldIndex;

    @Column(name = "new_index", nullable = false)
    private int newIndex;
}
