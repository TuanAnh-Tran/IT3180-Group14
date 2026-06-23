package com.cnpm.apartment;

import com.cnpm.apartment.dto.PaymentRequestDTO;
import com.cnpm.apartment.dto.ReceiptDTO;
import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.Fee;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Receipt;
import com.cnpm.apartment.model.enums.CalcMethod;
import com.cnpm.apartment.model.enums.FeeStatus;
import com.cnpm.apartment.model.enums.FeeType;
import com.cnpm.apartment.model.enums.ReceiptStatus;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.ReceiptRepository;
import com.cnpm.apartment.service.PaymentService;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PaymentServiceTest {

    @Mock
    private AssignedFeeRepository assignedFeeRepository;

    @Mock
    private ReceiptRepository receiptRepository;

    @Mock
    private HouseholdRepository householdRepository;

    @Mock
    private CalculatorFactory calculatorFactory;

    @Mock
    private FeeCalculator feeCalculator;

    @InjectMocks
    private PaymentService paymentService;

    private Household household;
    private Fee fee;
    private AssignedFee assignedFee;

    @BeforeEach
    void setUp() {
        household = Household.builder()
                .id("HH001")
                .ownerName("Test Owner")
                .balance(BigDecimal.ZERO)
                .build();

        fee = Fee.builder()
                .id("FEE001")
                .name("Service Fee")
                .type(FeeType.MANDATORY)
                .calcMethod(CalcMethod.FIXED)
                .price(BigDecimal.valueOf(100000))
                .build();

        com.cnpm.apartment.model.CollectionPeriod period = com.cnpm.apartment.model.CollectionPeriod.builder()
                .id("PER001")
                .name("Test Period")
                .build();

        assignedFee = AssignedFee.builder()
                .id("AF001")
                .household(household)
                .fee(fee)
                .period(period)
                .quantity(1.0)
                .status(FeeStatus.UNPAID)
                .amountPaidAccumulated(BigDecimal.ZERO)
                .build();
    }

    @Test
    void testRecordPayment_Normal() {
        PaymentRequestDTO req = new PaymentRequestDTO();
        req.setAssignedFeeId("AF001");
        req.setAmountPaid(BigDecimal.valueOf(100000));
        req.setPayerName("Jane Doe");

        when(assignedFeeRepository.findByIdForUpdate("AF001")).thenReturn(Optional.of(assignedFee));
        when(calculatorFactory.getCalculator(any())).thenReturn(feeCalculator);
        when(feeCalculator.calculate(any())).thenReturn(BigDecimal.valueOf(100000));

        ReceiptDTO dto = paymentService.recordPayment(req);

        assertNotNull(dto);
        assertEquals(FeeStatus.PAID, assignedFee.getStatus());
        assertEquals(BigDecimal.valueOf(100000), assignedFee.getAmountPaidAccumulated());
        verify(receiptRepository, times(1)).save(any(Receipt.class));
    }

    @Test
    void testRecordPayment_Overpayment_SavesToBalance() {
        PaymentRequestDTO req = new PaymentRequestDTO();
        req.setAssignedFeeId("AF001");
        req.setAmountPaid(BigDecimal.valueOf(150000)); // Pays 150k for a 100k fee

        when(assignedFeeRepository.findByIdForUpdate("AF001")).thenReturn(Optional.of(assignedFee));
        when(calculatorFactory.getCalculator(any())).thenReturn(feeCalculator);
        when(feeCalculator.calculate(any())).thenReturn(BigDecimal.valueOf(100000));

        ReceiptDTO dto = paymentService.recordPayment(req);

        assertNotNull(dto);
        assertEquals(FeeStatus.PAID, assignedFee.getStatus());
        assertEquals(BigDecimal.valueOf(100000), assignedFee.getAmountPaidAccumulated());
        assertEquals(BigDecimal.valueOf(50000), household.getBalance()); // 50k saved to balance
        verify(householdRepository, times(1)).save(household);
    }

    @Test
    void testRecordPayment_UseBalance() {
        household.setBalance(BigDecimal.valueOf(40000)); // Household already has 40k credit
        PaymentRequestDTO req = new PaymentRequestDTO();
        req.setAssignedFeeId("AF001");
        req.setAmountPaid(BigDecimal.valueOf(60000)); // Pays only 60k out of pocket

        when(assignedFeeRepository.findByIdForUpdate("AF001")).thenReturn(Optional.of(assignedFee));
        when(calculatorFactory.getCalculator(any())).thenReturn(feeCalculator);
        when(feeCalculator.calculate(any())).thenReturn(BigDecimal.valueOf(100000));

        ReceiptDTO dto = paymentService.recordPayment(req);

        assertNotNull(dto);
        assertEquals(FeeStatus.PAID, assignedFee.getStatus());
        assertEquals(BigDecimal.valueOf(100000), assignedFee.getAmountPaidAccumulated());
        assertEquals(BigDecimal.ZERO, household.getBalance()); // 40k credit fully used
    }

    @Test
    void testCancelReceipt() {
        Receipt receipt = Receipt.builder()
                .id("RC001")
                .assignedFee(assignedFee)
                .amountPaid(BigDecimal.valueOf(100000))
                .status(ReceiptStatus.ACTIVE)
                .build();

        assignedFee.setStatus(FeeStatus.PAID);
        assignedFee.setAmountPaidAccumulated(BigDecimal.valueOf(100000));

        when(receiptRepository.findById("RC001")).thenReturn(Optional.of(receipt));
        when(calculatorFactory.getCalculator(any())).thenReturn(feeCalculator);
        when(feeCalculator.calculate(any())).thenReturn(BigDecimal.valueOf(100000));

        paymentService.cancelReceipt("RC001");

        assertEquals(ReceiptStatus.CANCELLED, receipt.getStatus());
        assertEquals(FeeStatus.UNPAID, assignedFee.getStatus());
        assertEquals(BigDecimal.ZERO, assignedFee.getAmountPaidAccumulated());
    }

    @Test
    void testRecordPayment_Idempotency() {
        PaymentRequestDTO req = new PaymentRequestDTO();
        req.setAssignedFeeId("AF001");
        req.setAmountPaid(BigDecimal.valueOf(100000));
        req.setIdempotencyKey("IDEM_12345");

        Receipt existingReceipt = Receipt.builder()
                .id("RC001")
                .assignedFee(assignedFee)
                .amountPaid(BigDecimal.valueOf(100000))
                .status(ReceiptStatus.ACTIVE)
                .idempotencyKey("IDEM_12345")
                .paidAt(LocalDateTime.now())
                .build();

        when(receiptRepository.findByIdempotencyKey("IDEM_12345")).thenReturn(Optional.of(existingReceipt));
        when(calculatorFactory.getCalculator(any())).thenReturn(feeCalculator);
        when(feeCalculator.calculate(any())).thenReturn(BigDecimal.valueOf(100000));

        ReceiptDTO dto = paymentService.recordPayment(req);

        assertNotNull(dto);
        assertEquals("RC001", dto.getReceiptId());
        verify(assignedFeeRepository, never()).findByIdForUpdate(any());
    }
}
