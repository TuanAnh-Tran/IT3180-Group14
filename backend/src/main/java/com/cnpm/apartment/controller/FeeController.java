package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.model.Fee;
import com.cnpm.apartment.model.enums.CalcMethod;
import com.cnpm.apartment.model.enums.FeeType;
import com.cnpm.apartment.repository.FeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/fees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FeeController {

    private final FeeRepository feeRepository;

    public record FeeDTO(String id, String name, String type, String calcMethod, BigDecimal price) {}

    @GetMapping
    public ResponseEntity<ApiResponse<List<FeeDTO>>> getFees() {
        List<FeeDTO> result = feeRepository.findAll().stream()
                .sorted(Comparator.comparing(Fee::getId))
                .map(this::mapFee)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<FeeDTO>> saveFee(@RequestBody Map<String, Object> request) {
        String id = stringValue(request.get("id"));
        if (id.isBlank()) {
            id = "FEE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }

        String name = stringValue(request.get("name"));
        if (name.isBlank()) {
            throw new RuntimeException("Fee name is required.");
        }

        String calcMethodValue = stringValue(request.get("calcMethod"));
        Fee fee = feeRepository.findById(id).orElseGet(Fee::new);
        fee.setId(id);
        fee.setName(name);
        fee.setType(toBackendType(stringValue(request.get("type")), calcMethodValue));
        fee.setCalcMethod(toBackendCalcMethod(calcMethodValue));
        fee.setPrice(toBigDecimal(request.get("price")));

        return ResponseEntity.ok(ApiResponse.success("Fee saved successfully", mapFee(feeRepository.save(fee))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> deleteFee(@PathVariable String id) {
        if (!feeRepository.existsById(id)) {
            throw new RuntimeException("Fee not found: " + id);
        }
        feeRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Fee deleted successfully", null));
    }

    private FeeDTO mapFee(Fee fee) {
        return new FeeDTO(
                fee.getId(),
                fee.getName(),
                toFrontendType(fee.getType()),
                toFrontendCalcMethod(fee.getCalcMethod()),
                fee.getPrice());
    }

    private FeeType toBackendType(String value, String calcMethodValue) {
        String normalized = value == null ? "" : value.trim().toUpperCase();
        String calc = calcMethodValue == null ? "" : calcMethodValue.trim().toUpperCase();
        if ("COMPULSORY".equals(normalized) || "MANDATORY".equals(normalized)) {
            return "CONSUMPTION".equals(calc) ? FeeType.UTILITY : FeeType.MANDATORY;
        }
        if ("VEHICLE".equals(normalized)) {
            return FeeType.VEHICLE;
        }
        if ("UTILITY".equals(normalized)) {
            return FeeType.UTILITY;
        }
        return FeeType.VOLUNTARY;
    }

    private String toFrontendType(FeeType type) {
        if (type == FeeType.MANDATORY || type == FeeType.UTILITY) {
            return "COMPULSORY";
        }
        return "VOLUNTARY";
    }

    private CalcMethod toBackendCalcMethod(String value) {
        return switch (value == null ? "" : value.trim().toUpperCase()) {
            case "PER_MEMBER", "PER_PERSON" -> CalcMethod.PER_PERSON;
            case "PER_AREA", "PER_M2" -> CalcMethod.PER_M2;
            case "PER_VEHICLE" -> CalcMethod.PER_VEHICLE;
            case "PER_MOTORCYCLE" -> CalcMethod.PER_MOTORCYCLE;
            case "PER_CAR" -> CalcMethod.PER_CAR;
            case "CONSUMPTION" -> CalcMethod.CONSUMPTION;
            default -> CalcMethod.FIXED;
        };
    }

    private String toFrontendCalcMethod(CalcMethod method) {
        return switch (method) {
            case PER_PERSON -> "PER_MEMBER";
            case PER_M2 -> "PER_AREA";
            default -> method.name();
        };
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null || String.valueOf(value).isBlank()) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(String.valueOf(value));
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }
}
