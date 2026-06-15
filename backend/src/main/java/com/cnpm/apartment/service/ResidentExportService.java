package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.HouseholdDTO;
import com.cnpm.apartment.dto.ResidentDTO;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ResidentExportService {

    private final ResidentManagementService residentManagementService;

    public byte[] exportHouseholds() throws IOException {
        List<HouseholdDTO> households = residentManagementService.getAllHouseholdsForExport();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Households");
            writeRow(sheet.createRow(0), "Code", "Apartment", "Floor", "Area", "Head", "Phone",
                    "Status", "Members", "Motorcycles", "Cars", "Note");
            int rowIndex = 1;
            for (HouseholdDTO h : households) {
                writeRow(sheet.createRow(rowIndex++),
                        h.getCode(),
                        h.getApartmentNo(),
                        h.getFloor() == null ? "" : h.getFloor().toString(),
                        String.valueOf(h.getArea()),
                        h.getHeadName(),
                        h.getPhone(),
                        h.getStatus(),
                        String.valueOf(h.getMemberCount()),
                        String.valueOf(h.getMotorcycleCount()),
                        String.valueOf(h.getCarCount()),
                        h.getNote());
            }
            autoSize(sheet, 11);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportResidents() throws IOException {
        List<ResidentDTO> residents = residentManagementService.getAllResidentsForExport();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Residents");
            writeRow(sheet.createRow(0), "ID", "Full Name", "Gender", "Date of Birth", "Citizen ID",
                    "Phone", "Hometown", "Occupation", "Relationship", "Status", "Household", "Apartment");
            int rowIndex = 1;
            for (ResidentDTO r : residents) {
                writeRow(sheet.createRow(rowIndex++),
                        r.getId(),
                        r.getFullName(),
                        r.getGender(),
                        r.getDateOfBirth() == null ? "" : r.getDateOfBirth().toString(),
                        r.getIdentityNo(),
                        r.getPhone(),
                        r.getHometown(),
                        r.getOccupation(),
                        r.getRelationshipToHead(),
                        r.getStatus(),
                        r.getHouseholdId(),
                        r.getApartmentNo());
            }
            autoSize(sheet, 12);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void writeRow(Row row, String... values) {
        for (int i = 0; i < values.length; i++) {
            row.createCell(i).setCellValue(values[i] == null ? "" : values[i]);
        }
    }

    private void autoSize(Sheet sheet, int columns) {
        for (int i = 0; i < columns; i++) {
            sheet.autoSizeColumn(i);
        }
    }
}
