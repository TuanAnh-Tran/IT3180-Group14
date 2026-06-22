package com.cnpm.apartment.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Lịch sử chỉnh sửa chỉ số tiêu thụ điện nước.
 */
@Entity
@Table(name = "utility_record_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UtilityRecordHistory {

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

    @Column(name = "old_index_before", nullable = false)
    private int oldIndexBefore;

    @Column(name = "new_index_before", nullable = false)
    private int newIndexBefore;

    @Column(name = "old_index_after", nullable = false)
    private int oldIndexAfter;

    @Column(name = "new_index_after", nullable = false)
    private int newIndexAfter;

    @Column(name = "modified_by", nullable = false, length = 100)
    private String modifiedBy;

    @Column(name = "modified_at", nullable = false)
    private LocalDateTime modifiedAt;
}
