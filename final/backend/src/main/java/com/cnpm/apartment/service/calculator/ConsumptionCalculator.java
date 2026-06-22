package com.cnpm.apartment.service.calculator;

import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.UtilityRecord;
import com.cnpm.apartment.repository.UtilityRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class ConsumptionCalculator implements FeeCalculator {

    private final UtilityRecordRepository utilityRecordRepository;

    @Override
    public BigDecimal calculate(AssignedFee af) {
        String type = af.getFee().getName().toLowerCase().contains("water") ? "WATER" : "ELECTRICITY";
        Optional<UtilityRecord> record = utilityRecordRepository.findByHouseholdIdAndPeriodIdAndType(
                af.getHousehold().getId(),
                af.getPeriod().getId(),
                type
        );
        int consumption = record.map(r -> r.getNewIndex() - r.getOldIndex()).orElse(0);
        return af.getFee().getPrice().multiply(BigDecimal.valueOf(consumption));
    }
}
