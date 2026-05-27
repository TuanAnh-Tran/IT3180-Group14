package com.cnpm.apartment.model.enums;

public enum CalcMethod {
    FIXED,       // Cố định - tính theo giá cố định
    PER_PERSON,  // Theo đầu người - price * membersCount
    PER_M2,      // Theo diện tích - price * area
    PER_VEHICLE  // Theo số xe - price * quantity
}
