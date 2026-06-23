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
            writeRow(sheet.createRow(0), "Code", "Apartment", "Floor", "Area", "Head", "Head Citizen ID", "Phone",
                    "House No", "Street", "Ward", "District", "Registration Date", "Status", "Active Members",
                    "Motorcycles", "Cars", "Previous Owner", "Ownership Transferred At", "Note");
            int rowIndex = 1;
            for (HouseholdDTO h : households) {
                writeRow(sheet.createRow(rowIndex++),
                        h.getCode(),
                        h.getApartmentNo(),
                        h.getFloor() == null ? "" : h.getFloor().toString(),
                        String.valueOf(h.getArea()),
                        h.getHeadName(),
                        h.getHeadIdentityNo(),
                        h.getPhone(),
                        h.getHouseNo(),
                        h.getStreet(),
                        h.getWard(),
                        h.getDistrict(),
                        h.getRegistrationDate() == null ? "" : h.getRegistrationDate().toString(),
                        h.getStatus(),
                        String.valueOf(h.getActiveMemberCount()),
                        String.valueOf(h.getMotorcycleCount()),
                        String.valueOf(h.getCarCount()),
                        h.getPreviousOwnerName(),
                        h.getOwnershipTransferredAt() == null ? "" : h.getOwnershipTransferredAt().toString(),
                        h.getNote());
            }
            autoSize(sheet, 19);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportResidents() throws IOException {
        List<ResidentDTO> residents = residentManagementService.getAllResidentsForExport();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Residents");
            writeRow(sheet.createRow(0), "ID", "Full Name", "Alias", "Gender", "Date of Birth", "Citizen ID",
                    "Issue Date", "Issue Place", "Phone", "Birth Place", "Hometown", "Ethnicity", "Religion",
                    "Occupation", "Workplace", "Previous Residence", "Relationship", "Status", "Alive",
                    "Date of Death", "Household", "Apartment");
            int rowIndex = 1;
            for (ResidentDTO r : residents) {
                writeRow(sheet.createRow(rowIndex++),
                        r.getId(),
                        r.getFullName(),
                        r.getAlias(),
                        r.getGender(),
                        r.getDateOfBirth() == null ? "" : r.getDateOfBirth().toString(),
                        r.getIdentityNo(),
                        r.getIssueDate() == null ? "" : r.getIssueDate().toString(),
                        r.getIssuePlace(),
                        r.getPhone(),
                        r.getBirthPlace(),
                        r.getHometown(),
                        r.getEthnicity(),
                        r.getReligion(),
                        r.getOccupation(),
                        r.getWorkplace(),
                        r.getPreviousResidence(),
                        r.getRelationshipToHead(),
                        r.getStatus(),
                        r.isAlive() ? "Yes" : "No",
                        r.getDateOfDeath() == null ? "" : r.getDateOfDeath().toString(),
                        r.getHouseholdId(),
                        r.getApartmentNo());
            }
            autoSize(sheet, 22);
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
