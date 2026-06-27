package com.cnpm.apartment.service;

import com.cnpm.apartment.model.Receipt;
import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.repository.ReceiptRepository;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.model.enums.FeeStatus;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExportService {

    private final ReceiptRepository receiptRepository;
    private final AssignedFeeRepository assignedFeeRepository;
    private final PaymentService paymentService;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // =========================================================
    // XUẤT EXCEL - BIÊN LAI THEO ĐỢT THU
    // =========================================================

    public byte[] exportReceiptsByPeriod(String periodId) throws IOException {
        List<Receipt> receipts = receiptRepository.findAllByPeriodIdForExport(periodId);
        return buildReceiptExcel(receipts, "Period Receipts");
    }

    // =========================================================
    // XUẤT EXCEL - BIÊN LAI THEO KHOẢNG THỜI GIAN
    // =========================================================

    public byte[] exportReceiptsByDateRange(LocalDateTime from, LocalDateTime to) throws IOException {
        List<Receipt> receipts = receiptRepository.findAllByDateRangeForExport(from, to);
        return buildReceiptExcel(receipts, "Receipts " + from.format(DATE_FMT) + " - " + to.format(DATE_FMT));
    }

    // =========================================================
    // XUẤT EXCEL - DANH SÁCH NỢ THEO ĐỢT THU
    // =========================================================

    public byte[] exportDebtByPeriod(String periodId) throws IOException {
        List<AssignedFee> unpaid = assignedFeeRepository
                .findByPeriodIdAndStatusIn(periodId, List.of(FeeStatus.UNPAID, FeeStatus.PARTIAL),
                        org.springframework.data.domain.Pageable.unpaged())
                .getContent()
                .stream()
                .filter(this::hasOutstandingDebt)
                .toList();
        return buildDebtExcel(unpaid);
    }

    private boolean hasOutstandingDebt(AssignedFee af) {
        java.math.BigDecimal required = paymentService.calculateAmount(af);
        java.math.BigDecimal paid = af.getAmountPaidAccumulated() != null
                ? af.getAmountPaidAccumulated()
                : java.math.BigDecimal.ZERO;
        return required.subtract(paid).compareTo(java.math.BigDecimal.ZERO) > 0;
    }

    // =========================================================
    // HELPER: Tạo file Excel cho biên lai
    // =========================================================

    private byte[] buildReceiptExcel(List<Receipt> receipts, String sheetTitle) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Receipts");

            // === Style: Tiêu đề lớn ===
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);

            // === Style: Header bảng ===
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // === Style: Dữ liệu ===
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            // === Style: Số tiền ===
            CellStyle moneyStyle = workbook.createCellStyle();
            moneyStyle.cloneStyleFrom(dataStyle);
            DataFormat format = workbook.createDataFormat();
            moneyStyle.setDataFormat(format.getFormat("#,##0"));
            moneyStyle.setAlignment(HorizontalAlignment.RIGHT);

            // Row 0: Tiêu đề
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("APARTMENT - " + sheetTitle.toUpperCase());
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 7));

            // Row 1: Ngày xuất
            Row dateRow = sheet.createRow(1);
            dateRow.createCell(0).setCellValue("Export Date: " + LocalDateTime.now().format(FMT));

            // Row 3: Header bảng
            String[] headers = {"No.", "Household ID", "Owner", "Collection Period", "Fee Name", "Amount (VND)", "Paid Date", "Collector"};
            Row headerRow = sheet.createRow(3);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Row 4+: Dữ liệu
            int rowNum = 4;
            java.math.BigDecimal grandTotal = java.math.BigDecimal.ZERO;
            for (int i = 0; i < receipts.size(); i++) {
                Receipt r = receipts.get(i);
                AssignedFee af = r.getAssignedFee();
                Row row = sheet.createRow(rowNum++);

                createCell(row, 0, String.valueOf(i + 1), dataStyle);
                createCell(row, 1, af.getHousehold().getId(), dataStyle);
                createCell(row, 2, af.getHousehold().getOwnerName(), dataStyle);
                createCell(row, 3, af.getPeriod().getName(), dataStyle);
                createCell(row, 4, af.getFee().getName(), dataStyle);

                Cell moneyCell = row.createCell(5);
                moneyCell.setCellValue(r.getAmountPaid().doubleValue());
                moneyCell.setCellStyle(moneyStyle);

                createCell(row, 6,
                        r.getPaidAt() != null ? r.getPaidAt().format(FMT) : "", dataStyle);
                createCell(row, 7, r.getCreatedBy() != null ? r.getCreatedBy() : "", dataStyle);

                grandTotal = grandTotal.add(r.getAmountPaid());
            }

            // Row tổng cộng
            Row totalRow = sheet.createRow(rowNum);
            CellStyle totalStyle = workbook.createCellStyle();
            Font totalFont = workbook.createFont();
            totalFont.setBold(true);
            totalStyle.setFont(totalFont);
            totalStyle.setDataFormat(format.getFormat("#,##0"));
            totalStyle.setAlignment(HorizontalAlignment.RIGHT);
            totalStyle.setBorderBottom(BorderStyle.MEDIUM);
            totalStyle.setBorderTop(BorderStyle.MEDIUM);

            Cell totalLabel = totalRow.createCell(4);
            totalLabel.setCellValue("TOTAL:");
            CellStyle labelStyle = workbook.createCellStyle();
            Font labelFont = workbook.createFont();
            labelFont.setBold(true);
            labelStyle.setFont(labelFont);
            totalLabel.setCellStyle(labelStyle);

            Cell totalValue = totalRow.createCell(5);
            totalValue.setCellValue(grandTotal.doubleValue());
            totalValue.setCellStyle(totalStyle);

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // =========================================================
    // HELPER: Tạo file Excel cho danh sách nợ
    // =========================================================

    private byte[] buildDebtExcel(List<AssignedFee> unpaidList) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Debt List");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.CORAL.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            DataFormat format = workbook.createDataFormat();
            CellStyle moneyStyle = workbook.createCellStyle();
            moneyStyle.cloneStyleFrom(dataStyle);
            moneyStyle.setDataFormat(format.getFormat("#,##0"));
            moneyStyle.setAlignment(HorizontalAlignment.RIGHT);

            // Tiêu đề
            Row titleRow = sheet.createRow(0);
            titleRow.createCell(0).setCellValue("UNPAID HOUSEHOLDS LIST - Export Date: " + LocalDateTime.now().format(DATE_FMT));

            // Header
            String[] headers = {"No.", "Household ID", "Owner", "Collection Period", "Fee Name", "Amount Required (VND)", "Status"};
            Row headerRow = sheet.createRow(2);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Dữ liệu
            int rowNum = 3;
            for (int i = 0; i < unpaidList.size(); i++) {
                AssignedFee af = unpaidList.get(i);
                java.math.BigDecimal required = paymentService.calculateAmount(af);
                Row row = sheet.createRow(rowNum++);

                createCell(row, 0, String.valueOf(i + 1), dataStyle);
                createCell(row, 1, af.getHousehold().getId(), dataStyle);
                createCell(row, 2, af.getHousehold().getOwnerName(), dataStyle);
                createCell(row, 3, af.getPeriod().getName(), dataStyle);
                createCell(row, 4, af.getFee().getName(), dataStyle);

                Cell moneyCell = row.createCell(5);
                moneyCell.setCellValue(required.doubleValue());
                moneyCell.setCellStyle(moneyStyle);

                createCell(row, 6, "Unpaid", dataStyle);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // =========================================================
    // HELPER: Tạo cell với style
    // =========================================================

    private void createCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }
}
