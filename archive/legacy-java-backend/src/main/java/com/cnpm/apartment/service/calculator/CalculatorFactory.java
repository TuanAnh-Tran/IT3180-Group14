package com.cnpm.apartment.service.calculator;

import com.cnpm.apartment.model.enums.CalcMethod;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CalculatorFactory {

    private final FixedCalculator fixedCalculator;
    private final PerPersonCalculator perPersonCalculator;
    private final PerM2Calculator perM2Calculator;
    private final PerVehicleCalculator perVehicleCalculator;
    private final PerMotorcycleCalculator perMotorcycleCalculator;
    private final PerCarCalculator perCarCalculator;
    private final ConsumptionCalculator consumptionCalculator;

    public FeeCalculator getCalculator(CalcMethod method) {
        return switch (method) {
            case FIXED -> fixedCalculator;
            case PER_PERSON -> perPersonCalculator;
            case PER_M2 -> perM2Calculator;
            case PER_VEHICLE -> perVehicleCalculator;
            case PER_MOTORCYCLE -> perMotorcycleCalculator;
            case PER_CAR -> perCarCalculator;
            case CONSUMPTION -> consumptionCalculator;
        };
    }
}
