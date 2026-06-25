package com.cnpm.apartment.service;

import com.cnpm.apartment.model.Notification;
import com.cnpm.apartment.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public List<Notification> getCurrentUserNotifications() {
        return notificationRepository.findByTargetUsernameOrderByCreatedAtDesc(currentUsername());
    }

    @Transactional
    public Notification markRead(String id) {
        String username = currentUsername();
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found: " + id));

        if (!username.equalsIgnoreCase(notification.getTargetUsername())) {
            throw new RuntimeException("Notification does not belong to current user.");
        }

        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    @Transactional
    public List<Notification> markAllRead() {
        String username = currentUsername();
        List<Notification> unread = notificationRepository
                .findByTargetUsernameAndReadFalseOrderByCreatedAtDesc(username);
        unread.forEach(notification -> notification.setRead(true));
        return notificationRepository.saveAll(unread);
    }

    private String currentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
