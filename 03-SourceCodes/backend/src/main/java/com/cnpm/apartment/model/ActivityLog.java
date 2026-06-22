package com.cnpm.apartment.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Nhật ký hoạt động của cư dân và hộ gia đình.
 */
@Entity
@Table(name = "activity_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityLog {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "actor", length = 100)
    private String actor;

    @Column(name = "action", nullable = false, length = 100)
    private String action; // CREATE, UPDATE, DELETE, ADD_MEMBER, REMOVE_MEMBER

    @Column(name = "target_type", nullable = false, length = 100)
    private String targetType; // HOUSEHOLD, RESIDENT, VEHICLE

    @Column(name = "target_id", nullable = false, length = 100)
    private String targetId;

    @Column(name = "detail", length = 500)
    private String detail;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
