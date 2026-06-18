package com.cnpm.apartment.service.calculator;

import com.cnpm.apartment.model.AssignedFee;
import java.math.BigDecimal;

public interface FeeCalculator {
    BigDecimal calculate(AssignedFee af);
}
