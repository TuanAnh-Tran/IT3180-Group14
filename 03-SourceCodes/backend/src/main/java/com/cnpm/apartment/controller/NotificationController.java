package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.model.Notification;
import com.cnpm.apartment.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    /**
     * GET /api/notifications
     * Lấy danh sách thông báo của cư dân hiện tại
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<List<Notification>>> getMyNotifications() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        List<Notification> list = notificationRepository.findByUsernameOrderByCreatedAtDesc(username);
        return ResponseEntity.ok(ApiResponse.success("Notifications fetched successfully", list));
    }

    /**
     * PUT /api/notifications/mark-read
     * Đánh dấu tất cả thông báo của cư dân hiện tại là đã đọc
     */
    @PutMapping("/mark-read")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        List<Notification> unread = notificationRepository.findByUsernameAndReadOrderByCreatedAtDesc(username, false);
        for (Notification n : unread) {
            n.setRead(true);
        }
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", null));
    }

    /**
     * PUT /api/notifications/{id}/read
     * Đánh dấu một thông báo cụ thể là đã đọc
     */
    @PutMapping("/{id}/read")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable String id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!n.getUsername().equals(username)) {
            throw new RuntimeException("You are not authorized to access this notification");
        }

        n.setRead(true);
        notificationRepository.save(n);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", null));
    }
}
