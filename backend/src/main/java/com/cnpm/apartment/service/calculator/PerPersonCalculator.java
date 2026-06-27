package com.cnpm.apartment.service.calculator;

import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.repository.ResidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
public class PerPersonCalculator implements FeeCalculator {
    private final ResidentRepository residentRepository;

    @Override
    public BigDecimal calculate(AssignedFee af) {
        long activeMembers = residentRepository.countActiveMembers(af.getHousehold().getId());
        return af.getFee().getPrice().multiply(BigDecimal.valueOf(activeMembers));
    }
}
