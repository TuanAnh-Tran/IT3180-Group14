package com.fee.system.config;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

/**
 * LỚP ĐỌC CẤU HÌNH HỆ THỐNG (APPCONFIG)
 * Đọc dữ liệu từ file ngoài config.properties bằng Properties API của Java.
 * Có cơ chế tự động nạp giá trị mặc định (Fallback) nếu tệp cấu hình bị mất hoặc lỗi.
 */
public class AppConfig {
    private static final String CONFIG_FILE = "config.properties";
    private static final Properties properties = new Properties();

    static {
        // Tự động load cấu hình khi lớp được nạp vào bộ nhớ (Static Block)
        try (InputStream input = new FileInputStream(CONFIG_FILE)) {
            // Sử dụng InputStreamReader kèm UTF-8 để hỗ trợ Tiếng Việt có dấu trong file cấu hình
            properties.load(new InputStreamReader(input, StandardCharsets.UTF_8));
            System.out.println("[INFO] Đã nạp thành công tệp cấu hình ngoài: " + CONFIG_FILE);
        } catch (IOException ex) {
            System.out.println("[WARNING] Không tìm thấy hoặc lỗi đọc tệp " + CONFIG_FILE + ". Sử dụng cấu hình mặc định (Failsafe).");
        }
    }

    /**
     * Lấy cổng mạng (port) của server, mặc định là 8080
     */
    public static int getServerPort() {
        return Integer.parseInt(properties.getProperty("server.port", "8080"));
    }

    /**
     * Helper lấy giá trị String từ cấu hình
     */
    public static String getProperty(String key, String defaultValue) {
        return properties.getProperty(key, defaultValue);
    }

    /**
     * Helper lấy giá trị Double từ cấu hình
     */
    public static double getDoubleProperty(String key, double defaultValue) {
        String val = properties.getProperty(key);
        if (val == null) return defaultValue;
        try {
            return Double.parseDouble(val);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
