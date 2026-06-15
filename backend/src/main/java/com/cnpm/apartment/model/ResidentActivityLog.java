package com.cnpm.apartment.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "resident_activity_log", indexes = {
        @Index(name = "idx_resident_log_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResidentActivityLog {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "actor", length = 100)
    private String actor;

    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @Column(name = "target_type", nullable = false, length = 50)
    private String targetType;

    @Column(name = "target_id", nullable = false, length = 50)
    private String targetId;

    @Column(name = "detail", length = 1000)
    private String detail;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
