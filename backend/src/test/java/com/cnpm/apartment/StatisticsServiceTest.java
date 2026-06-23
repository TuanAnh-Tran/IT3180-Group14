package com.cnpm.apartment;

import com.cnpm.apartment.dto.ContributionDTO;
import com.cnpm.apartment.dto.OverviewProjection;
import com.cnpm.apartment.dto.StatisticsDTO;
import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.Fee;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.enums.CalcMethod;
import com.cnpm.apartment.model.enums.FeeStatus;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.service.StatisticsService;
import com.cnpm.apartment.service.calculator.CalculatorFactory;
import com.cnpm.apartment.service.calculator.FeeCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StatisticsServiceTest {

    @Mock
    private AssignedFeeRepository assignedFeeRepository;

    @Mock
    private HouseholdRepository householdRepository;

    @Mock
    private CalculatorFactory calculatorFactory;

    @Mock
    private FeeCalculator feeCalculator;

    @InjectMocks
    private StatisticsService statisticsService;

    private OverviewProjection mockOverviewProjection;

    @BeforeEach
    void setUp() {
        mockOverviewProjection = new OverviewProjection() {
            @Override
            public long getPaidCount() {
                return 5;
            }

            @Override
            public long getUnpaidCount() {
                return 2;
            }

            @Override
            public long getPartialCount() {
                return 1;
            }

            @Override
            public BigDecimal getTotalCollected() {
                return BigDecimal.valueOf(500000);
            }

            @Override
            public long getTotalAssignments() {
                return 8;
            }
        };
    }

    @Test
    void testGetOverview() {
        when(householdRepository.count()).thenReturn(10L);
        when(assignedFeeRepository.getOverviewStatistics()).thenReturn(mockOverviewProjection);

        List<AssignedFee> unpaidFees = new ArrayList<>();
        Household household = Household.builder().id("HH001").build();
        Fee fee = Fee.builder().id("FEE001").calcMethod(CalcMethod.FIXED).build();
        AssignedFee af = AssignedFee.builder()
                .id("AF001")
                .household(household)
                .fee(fee)
                .amountPaidAccumulated(BigDecimal.valueOf(20000))
                .status(FeeStatus.PARTIAL)
                .build();
        unpaidFees.add(af);

        when(assignedFeeRepository.findByStatusIn(any())).thenReturn(unpaidFees);
        when(calculatorFactory.getCalculator(CalcMethod.FIXED)).thenReturn(feeCalculator);
        when(feeCalculator.calculate(any())).thenReturn(BigDecimal.valueOf(100000));

        StatisticsDTO stats = statisticsService.getOverview();

        assertNotNull(stats);
        assertEquals(BigDecimal.valueOf(500000), stats.getTotalCollected());
        assertEquals(BigDecimal.valueOf(80000), stats.getTotalPending()); // 100k - 20k = 80k
        assertEquals(10L, stats.getTotalHouseholds());
        assertEquals(5L, stats.getPaidHouseholds());
        assertEquals(3L, stats.getUnpaidHouseholds()); // unpaidCount (2) + partialCount (1) = 3
        assertEquals(62.5, stats.getCompletionRate()); // 5 / 8 * 100 = 62.5
    }

    @Test
    void testGetVoluntaryContributions() {
        List<AssignedFee> voluntaryFees = new ArrayList<>();
        Household hh = Household.builder().id("HH001").ownerName("John Doe").build();
        Fee fee = Fee.builder().id("FEE002").name("Voluntary Fund").build();
        AssignedFee af = AssignedFee.builder()
                .household(hh)
                .fee(fee)
                .amountPaidAccumulated(BigDecimal.valueOf(150000))
                .paidAt(LocalDateTime.of(2026, 6, 23, 10, 0))
                .build();
        voluntaryFees.add(af);

        when(assignedFeeRepository.findVoluntaryContributions()).thenReturn(voluntaryFees);

        List<ContributionDTO> contributions = statisticsService.getVoluntaryContributions();

        assertNotNull(contributions);
        assertEquals(1, contributions.size());
        assertEquals("HH001", contributions.get(0).getHouseholdId());
        assertEquals("John Doe", contributions.get(0).getOwnerName());
        assertEquals("Voluntary Fund", contributions.get(0).getFeeName());
        assertEquals(BigDecimal.valueOf(150000), contributions.get(0).getAmountPaid());
        assertNotNull(contributions.get(0).getPaidAt());
    }
}
