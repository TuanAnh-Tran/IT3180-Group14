package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByTargetUsernameOrderByCreatedAtDesc(String targetUsername);

    List<Notification> findByTargetUsernameAndReadFalseOrderByCreatedAtDesc(String targetUsername);

    void deleteByTargetUsername(String targetUsername);
}
