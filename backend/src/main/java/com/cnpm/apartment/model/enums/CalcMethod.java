package com.cnpm.apartment.model.enums;

public enum CalcMethod {
    FIXED,           // Cố định - tính theo giá cố định
    PER_PERSON,      // Theo đầu người - price * membersCount
    PER_M2,          // Theo diện tích - price * area
    PER_VEHICLE,     // Theo số xe - price * quantity
    PER_MOTORCYCLE,  // Theo số xe máy - price * motorcycleCount
    PER_CAR,         // Theo số ô tô - price * carCount
    CONSUMPTION      // Theo chỉ số tiêu thụ - price * (newIndex - oldIndex)
}
