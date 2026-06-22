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
        
        if (record.isPresent()) {
            UtilityRecord r = record.get();
            if (r.getNewIndex() < r.getOldIndex()) {
                String typeName = "WATER".equals(type) ? "nước" : "điện";
                throw new IllegalArgumentException(String.format(
                        "Chỉ số %s mới (%d) không được nhỏ hơn chỉ số cũ (%d) của hộ %s.",
                        typeName, r.getNewIndex(), r.getOldIndex(), af.getHousehold().getId()
                ));
            }
        }
        
        int consumption = record.map(r -> r.getNewIndex() - r.getOldIndex()).orElse(0);
        return af.getFee().getPrice().multiply(BigDecimal.valueOf(consumption));
    }
}
