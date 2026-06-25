package com.cnpm.apartment.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(0)
@RequiredArgsConstructor
public class ResidentSchemaMigrator implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("ALTER TABLE resident MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PERMANENT'");
        jdbcTemplate.execute("ALTER TABLE household MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'OCCUPIED'");
        jdbcTemplate.execute("ALTER TABLE fee MODIFY COLUMN calc_method ENUM('FIXED','PER_PERSON','PER_M2','PER_VEHICLE','PER_MOTORCYCLE','PER_CAR','CONSUMPTION') NOT NULL");
    }
}
