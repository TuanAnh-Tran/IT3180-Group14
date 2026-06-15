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
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
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
            residentRepository.save(Resident.builder()
                    .id("RES-AN001")
                    .fullName("Nguyen Van An")
                    .gender("Male")
                    .dateOfBirth(LocalDate.of(1985, 4, 12))
                    .identityNo("001085000111")
                    .phone("0987654321")
                    .hometown("Hanoi")
                    .occupation("Engineer")
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
                    .hometown("Hanoi")
                    .occupation("Teacher")
                    .relationshipToHead("Spouse")
                    .status(ResidentStatus.PERMANENT)
                    .household(hh1)
                    .build());
            hh1.setMembersCount(2);
            householdRepository.save(hh1);
        }
        if (hh2 != null) {
            residentRepository.save(Resident.builder()
                    .id("RES-BINH003")
                    .fullName("Tran Thi Binh")
                    .gender("Female")
                    .dateOfBirth(LocalDate.of(1979, 1, 15))
                    .identityNo("031079000333")
                    .phone("0911222333")
                    .hometown("Nam Dinh")
                    .occupation("Accountant")
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
                    .hometown("Hai Phong")
                    .occupation("Student")
                    .relationshipToHead("Tenant")
                    .status(ResidentStatus.TEMPORARY)
                    .household(hh2)
                    .build());
            hh2.setMembersCount(2);
            householdRepository.save(hh2);
        }
    }
}
