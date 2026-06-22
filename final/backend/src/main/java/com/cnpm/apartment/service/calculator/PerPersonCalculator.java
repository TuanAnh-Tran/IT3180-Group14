package com.cnpm.apartment.service.calculator;

import com.cnpm.apartment.model.AssignedFee;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;

@Component
public class PerPersonCalculator implements FeeCalculator {
    @Override
    public BigDecimal calculate(AssignedFee af) {
        return af.getFee().getPrice().multiply(BigDecimal.valueOf(af.getHousehold().getMembersCount()));
    }
}
