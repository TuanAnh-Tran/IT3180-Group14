package com.cnpm.apartment.controller;

import com.cnpm.apartment.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReportController {

    private final ExportService exportService;

    private static final String EXCEL_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final DateTimeFormatter FILE_FMT =
            DateTimeFormatter.ofPattern("yyyyMMdd_HHmm");

    /**
     * GET /api/reports/receipts/by-period/{periodId}
     * Xuất Excel biên lai theo đợt thu.
     */
    @GetMapping("/receipts/by-period/{periodId}")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<byte[]> exportReceiptsByPeriod(
            @PathVariable String periodId) throws IOException {

        byte[] data = exportService.exportReceiptsByPeriod(periodId);
        String filename = "bienLai_dot_" + periodId + "_" + LocalDateTime.now().format(FILE_FMT) + ".xlsx";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(EXCEL_CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(data);
    }

    /**
     * GET /api/reports/receipts/by-date?from=...&to=...
     * Xuất Excel biên lai theo khoảng thời gian.
     */
    @GetMapping("/receipts/by-date")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<byte[]> exportReceiptsByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to)
            throws IOException {

        byte[] data = exportService.exportReceiptsByDateRange(from, to);
        String filename = "bienLai_" + LocalDateTime.now().format(FILE_FMT) + ".xlsx";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(EXCEL_CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(data);
    }

    /**
     * GET /api/reports/debt/by-period/{periodId}
     * Xuất Excel danh sách hộ chưa nộp theo đợt thu.
     */
    @GetMapping("/debt/by-period/{periodId}")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<byte[]> exportDebtByPeriod(
            @PathVariable String periodId) throws IOException {

        byte[] data = exportService.exportDebtByPeriod(periodId);
        String filename = "danhSachNo_dot_" + periodId + "_" + LocalDateTime.now().format(FILE_FMT) + ".xlsx";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(EXCEL_CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(data);
    }
}

