package com.cnpm.apartment.model;

import com.cnpm.apartment.model.enums.ResidentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "resident",
        indexes = {
                @Index(name = "idx_resident_identity", columnList = "identity_no"),
                @Index(name = "idx_resident_household", columnList = "household_id"),
                @Index(name = "idx_resident_status", columnList = "status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resident {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "gender", length = 20)
    private String gender;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "identity_no", nullable = false, unique = true, length = 12)
    private String identityNo;

    @Column(name = "phone", length = 10)
    private String phone;

    @Column(name = "alias", length = 100)
    private String alias;

    @Column(name = "birth_place", length = 255)
    private String birthPlace;

    @Column(name = "hometown", length = 255)
    private String hometown;

    @Column(name = "ethnicity", length = 100)
    private String ethnicity;

    @Column(name = "religion", length = 100)
    private String religion;

    @Column(name = "occupation", length = 255)
    private String occupation;

    @Column(name = "workplace", length = 255)
    private String workplace;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "issue_place", length = 255)
    private String issuePlace;

    @Column(name = "previous_residence", length = 500)
    private String previousResidence;

    @Column(name = "relationship_to_head", length = 100)
    private String relationshipToHead;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ResidentStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "household_id")
    private Household household;

    @Builder.Default
    @Column(name = "alive", nullable = false)
    private boolean alive = true;

    @Column(name = "date_of_death")
    private LocalDate dateOfDeath;

    @Builder.Default
    @Column(name = "archived", nullable = false)
    private boolean archived = false;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.status == null) {
            this.status = ResidentStatus.PERMANENT;
        }
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
