package com.cnpm.apartment.service.calculator;

import com.cnpm.apartment.model.AssignedFee;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;

@Component
public class FixedCalculator implements FeeCalculator {
    @Override
    public BigDecimal calculate(AssignedFee af) {
        if ("FEE_DEBT".equals(af.getFee().getId())) {
            return af.getFee().getPrice().multiply(BigDecimal.valueOf(af.getQuantity()));
        }
        return af.getFee().getPrice();
    }
}
