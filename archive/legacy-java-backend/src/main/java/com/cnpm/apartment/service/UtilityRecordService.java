package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.UtilityRecordUpdateDTO;
import com.cnpm.apartment.dto.UtilityRecordHistoryDTO;
import com.cnpm.apartment.model.*;
import com.cnpm.apartment.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UtilityRecordService {

    private final UtilityRecordRepository utilityRecordRepository;
    private final UtilityRecordHistoryRepository utilityRecordHistoryRepository;
    private final AssignedFeeRepository assignedFeeRepository;
    private final HouseholdRepository householdRepository;
    private final CollectionPeriodRepository collectionPeriodRepository;
    private final FeeRepository feeRepository;

    @Transactional
    public void updateUtilityRecord(UtilityRecordUpdateDTO request) {
        // 1. Tìm các thực thể liên quan
        Household household = householdRepository.findById(request.getHouseholdId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hộ dân với ID: " + request.getHouseholdId()));

        CollectionPeriod period = collectionPeriodRepository.findById(request.getPeriodId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đợt thu với ID: " + request.getPeriodId()));

        Fee fee = feeRepository.findById(request.getFeeId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khoản phí với ID: " + request.getFeeId()));

        // Xác định loại chỉ số tiêu thụ dựa trên tên phí
        String type = fee.getName().toLowerCase().contains("water") ? "WATER" : "ELECTRICITY";
        String typeName = "WATER".equals(type) ? "nước" : "điện";

        // 2. Kiểm tra tính hợp lệ: chỉ số mới không được nhỏ hơn chỉ số cũ
        if (request.getNewIndex() < request.getOldIndex()) {
            throw new IllegalArgumentException(String.format(
                    "Chỉ số %s mới (%d) không được nhỏ hơn chỉ số cũ (%d) của hộ %s.",
                    typeName, request.getNewIndex(), request.getOldIndex(), household.getId()
            ));
        }

        // 3. Tìm bản ghi chỉ số hiện tại
        Optional<UtilityRecord> optionalRecord = utilityRecordRepository.findByHouseholdIdAndPeriodIdAndType(
                household.getId(), period.getId(), type
        );

        int oldIndexBefore = 0;
        int newIndexBefore = 0;
        UtilityRecord record;

        if (optionalRecord.isPresent()) {
            record = optionalRecord.get();
            oldIndexBefore = record.getOldIndex();
            newIndexBefore = record.getNewIndex();
            
            // Cập nhật giá trị mới
            record.setOldIndex(request.getOldIndex());
            record.setNewIndex(request.getNewIndex());
        } else {
            // Tạo mới bản ghi chỉ số tiêu thụ
            record = UtilityRecord.builder()
                    .id(UUID.randomUUID().toString())
                    .household(household)
                    .period(period)
                    .type(type)
                    .oldIndex(request.getOldIndex())
                    .newIndex(request.getNewIndex())
                    .build();
        }

        utilityRecordRepository.save(record);

        // 4. Ghi lại lịch sử chỉnh sửa nếu có sự thay đổi về số liệu
        if (oldIndexBefore != request.getOldIndex() || newIndexBefore != request.getNewIndex() || !optionalRecord.isPresent()) {
            // Lấy tên người dùng hiện tại đang đăng nhập từ Spring Security Context
            String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();

            UtilityRecordHistory history = UtilityRecordHistory.builder()
                    .id(UUID.randomUUID().toString())
                    .household(household)
                    .period(period)
                    .type(type)
                    .oldIndexBefore(oldIndexBefore)
                    .newIndexBefore(newIndexBefore)
                    .oldIndexAfter(request.getOldIndex())
                    .newIndexAfter(request.getNewIndex())
                    .modifiedBy(currentUser)
                    .modifiedAt(LocalDateTime.now())
                    .build();

            utilityRecordHistoryRepository.save(history);
            log.info("Đã ghi nhận lịch sử chỉnh sửa chỉ số {} cho hộ {}: {} -> {} (sửa bởi {})", 
                    type, household.getId(), oldIndexBefore + "-" + newIndexBefore, request.getOldIndex() + "-" + request.getNewIndex(), currentUser);
        }

        // 5. Đồng bộ lượng tiêu thụ sang AssignedFee
        Optional<AssignedFee> optionalAssignedFee = assignedFeeRepository.findByHouseholdIdAndPeriodIdAndFeeId(
                household.getId(), period.getId(), fee.getId()
        );

        if (optionalAssignedFee.isPresent()) {
            AssignedFee af = optionalAssignedFee.get();
            af.setQuantity((double) (request.getNewIndex() - request.getOldIndex()));
            assignedFeeRepository.save(af);
        }
    }

    @Transactional(readOnly = true)
    public List<UtilityRecordHistoryDTO> getUtilityHistory() {
        return utilityRecordHistoryRepository.findAllByOrderByModifiedAtDesc().stream()
                .map(h -> UtilityRecordHistoryDTO.builder()
                        .id(h.getId())
                        .householdId(h.getHousehold().getId())
                        .periodId(h.getPeriod().getId())
                        .periodName(h.getPeriod().getName())
                        .type(h.getType())
                        .oldIndexBefore(h.getOldIndexBefore())
                        .newIndexBefore(h.getNewIndexBefore())
                        .oldIndexAfter(h.getOldIndexAfter())
                        .newIndexAfter(h.getNewIndexAfter())
                        .modifiedBy(h.getModifiedBy())
                        .modifiedAt(h.getModifiedAt())
                        .build())
                .collect(Collectors.toList());
    }
}
