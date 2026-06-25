package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.FeeDTO;
import com.cnpm.apartment.dto.FeeSaveDTO;
import com.cnpm.apartment.model.Fee;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.FeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service quản lý nghiệp vụ liên quan đến Khoản phí (Fee).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FeeService {

    private final FeeRepository feeRepository;
    private final AssignedFeeRepository assignedFeeRepository;

    /**
     * Lấy toàn bộ danh sách khoản phí.
     */
    @Transactional(readOnly = true)
    public List<FeeDTO> getAllFees() {
        return feeRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Lấy thông tin chi tiết một khoản phí.
     */
    @Transactional(readOnly = true)
    public FeeDTO getFeeById(String id) {
        Fee fee = feeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khoản phí với ID: " + id));
        return mapToDTO(fee);
    }

    /**
     * Lưu thông tin khoản phí (Thêm mới hoặc Cập nhật).
     */
    @Transactional
    public FeeDTO saveFee(FeeSaveDTO request) {
        Fee fee;
        if (request.getId() != null && !request.getId().trim().isEmpty()) {
            // Cập nhật
            fee = feeRepository.findById(request.getId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy khoản phí với ID: " + request.getId()));
            fee.setName(request.getName());
            fee.setType(request.getType());
            fee.setCalcMethod(request.getCalcMethod());
            fee.setPrice(request.getPrice());
            log.info("Cập nhật khoản phí thành công: {}", fee.getId());
        } else {
            // Thêm mới - tự sinh ID ngẫu nhiên định dạng FEE_XXXXXXXX
            String uniqueId = "FEE_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            while (feeRepository.existsById(uniqueId)) {
                uniqueId = "FEE_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            }
            fee = Fee.builder()
                    .id(uniqueId)
                    .name(request.getName())
                    .type(request.getType())
                    .calcMethod(request.getCalcMethod())
                    .price(request.getPrice())
                    .build();
            log.info("Tạo mới khoản phí với ID: {}", uniqueId);
        }

        Fee saved = feeRepository.save(fee);
        return mapToDTO(saved);
    }

    /**
     * Xóa khoản phí theo ID.
     */
    @Transactional
    public void deleteFee(String id) {
        Fee fee = feeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khoản phí với ID: " + id));

        // Kiểm tra xem phí đã được gán cho hộ gia đình nào trong các đợt thu chưa
        if (assignedFeeRepository.existsByFeeId(id)) {
            throw new IllegalArgumentException("Không thể xóa khoản phí \"" + fee.getName() + "\" vì nó đang được gán cho các hộ gia đình.");
        }

        feeRepository.delete(fee);
        log.info("Đã xóa khoản phí thành công: {}", id);
    }

    /**
     * Chuyển đổi thực thể Fee thành FeeDTO.
     */
    private FeeDTO mapToDTO(Fee fee) {
        return FeeDTO.builder()
                .id(fee.getId())
                .name(fee.getName())
                .type(fee.getType())
                .calcMethod(fee.getCalcMethod())
                .price(fee.getPrice())
                .build();
    }
}
