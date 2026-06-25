package com.cnpm.apartment.dto;

import java.math.BigDecimal;

public interface OverviewProjection {
    long getTotalAssignments();
    long getPaidCount();
    long getUnpaidCount();
    long getPartialCount();
    BigDecimal getTotalCollected();
}
