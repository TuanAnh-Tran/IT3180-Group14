package com.cnpm.apartment.config;

import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Resident;
import com.cnpm.apartment.model.enums.HouseholdStatus;
import com.cnpm.apartment.model.enums.ResidentStatus;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.ResidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
@Order(1)
@RequiredArgsConstructor
public class ResidentDataSeeder implements ApplicationRunner {

    private final HouseholdRepository householdRepository;
    private final ResidentRepository residentRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (householdRepository.count() == 0) {
            Household hh1 = householdRepository.save(Household.builder()
                    .id("HH-A1201")
                    .apartmentNo("A1201")
                    .floor(12)
                    .area(72.5)
                    .ownerName("Nguyen Van An")
                    .phone("0987654321")
                    .houseNo("12")
                    .street("Tran Duy Hung")
                    .ward("Trung Hoa")
                    .district("Cau Giay")
                    .registrationDate(LocalDate.of(2024, 1, 10))
                    .membersCount(0)
                    .motorcycleCount(2)
                    .carCount(0)
                    .status(HouseholdStatus.OCCUPIED)
                    .note("Completed permanent residence registration.")
                    .build());
            Household hh2 = householdRepository.save(Household.builder()
                    .id("HH-B0805")
                    .apartmentNo("B0805")
                    .floor(8)
                    .area(65.0)
                    .ownerName("Tran Thi Binh")
                    .phone("0911222333")
                    .houseNo("8")
                    .street("Pham Hung")
                    .ward("My Dinh 1")
                    .district("Nam Tu Liem")
                    .registrationDate(LocalDate.of(2024, 3, 15))
                    .membersCount(0)
                    .motorcycleCount(1)
                    .carCount(1)
                    .status(HouseholdStatus.OCCUPIED)
                    .note("One temporary resident.")
                    .build());
            seedResidents(hh1, hh2);
        } else if (residentRepository.count() == 0) {
            Household hh1 = householdRepository.findById("HH-A1201")
                    .orElseGet(() -> householdRepository.findAll().stream().findFirst().orElse(null));
            Household hh2 = householdRepository.findById("HH-B0805")
                    .orElseGet(() -> householdRepository.findAll().stream().skip(1).findFirst().orElse(null));
            seedResidents(hh1, hh2);
        }
    }

    private void seedResidents(Household hh1, Household hh2) {
        if (hh1 != null) {
            Resident an = residentRepository.save(Resident.builder()
                    .id("RES-AN001")
                    .fullName("Nguyen Van An")
                    .gender("Male")
                    .dateOfBirth(LocalDate.of(1985, 4, 12))
                    .identityNo("001085000111")
                    .phone("0987654321")
                    .birthPlace("Hanoi")
                    .hometown("Hanoi")
                    .ethnicity("Kinh")
                    .religion("None")
                    .occupation("Engineer")
                    .workplace("Tech Company")
                    .issueDate(LocalDate.of(2021, 5, 20))
                    .issuePlace("Police Department")
                    .previousResidence("Cau Giay, Hanoi")
                    .relationshipToHead("Head")
                    .status(ResidentStatus.PERMANENT)
                    .household(hh1)
                    .build());
            residentRepository.save(Resident.builder()
                    .id("RES-HA002")
                    .fullName("Le Thu Ha")
                    .gender("Female")
                    .dateOfBirth(LocalDate.of(1988, 8, 20))
                    .identityNo("001188000222")
                    .phone("0977000111")
                    .birthPlace("Hanoi")
                    .hometown("Hanoi")
                    .ethnicity("Kinh")
                    .religion("None")
                    .occupation("Teacher")
                    .workplace("Secondary School")
                    .issueDate(LocalDate.of(2021, 6, 11))
                    .issuePlace("Police Department")
                    .previousResidence("Cau Giay, Hanoi")
                    .relationshipToHead("Spouse")
                    .status(ResidentStatus.PERMANENT)
                    .household(hh1)
                    .build());
            hh1.setHeadResident(an);
            hh1.setMembersCount(2);
            householdRepository.save(hh1);
        }
        if (hh2 != null) {
            Resident binh = residentRepository.save(Resident.builder()
                    .id("RES-BINH003")
                    .fullName("Tran Thi Binh")
                    .gender("Female")
                    .dateOfBirth(LocalDate.of(1979, 1, 15))
                    .identityNo("031079000333")
                    .phone("0911222333")
                    .birthPlace("Nam Dinh")
                    .hometown("Nam Dinh")
                    .ethnicity("Kinh")
                    .religion("None")
                    .occupation("Accountant")
                    .workplace("Finance Office")
                    .issueDate(LocalDate.of(2020, 9, 9))
                    .issuePlace("Police Department")
                    .previousResidence("Nam Dinh")
                    .relationshipToHead("Head")
                    .status(ResidentStatus.PERMANENT)
                    .household(hh2)
                    .build());
            residentRepository.save(Resident.builder()
                    .id("RES-DUC004")
                    .fullName("Pham Minh Duc")
                    .gender("Male")
                    .dateOfBirth(LocalDate.of(1998, 11, 2))
                    .identityNo("022098000444")
                    .phone("0909090909")
                    .birthPlace("Hai Phong")
                    .hometown("Hai Phong")
                    .ethnicity("Kinh")
                    .religion("None")
                    .occupation("Student")
                    .workplace("University")
                    .issueDate(LocalDate.of(2022, 2, 15))
                    .issuePlace("Police Department")
                    .previousResidence("Hai Phong")
                    .relationshipToHead("Tenant")
                    .status(ResidentStatus.TEMPORARY)
                    .household(hh2)
                    .build());
            hh2.setHeadResident(binh);
            hh2.setMembersCount(2);
            householdRepository.save(hh2);
        }
    }
}
