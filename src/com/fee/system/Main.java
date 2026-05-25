package com.fee.system;

import com.fee.system.config.AppConfig;
import com.fee.system.services.FeeManager;
import com.fee.system.web.WebServer;
import java.io.IOException;

public class Main {
    public static void main(String[] args) {
        System.out.println("==========================================================================");
        System.out.println("      HỆ THỐNG QUẢN LÝ THU PHÍ HỘ GIA ĐÌNH - FULLSTACK JAVA ENGINE        ");
        System.out.println("==========================================================================");

        // 1. Khởi tạo bộ quản lý nghiệp vụ chính
        System.out.println("[INFO] Đang khởi tạo bộ quản lý FeeManager...");
        FeeManager manager = new FeeManager();

        // 2. Nạp dữ liệu mẫu ban đầu
        System.out.println("[INFO] Đang nạp dữ liệu mẫu ban đầu (5 hộ dân, 5 loại phí, 1 đợt thu)...");
        manager.initSampleData();

        // 3. Khởi chạy máy chủ Web Server Java thông qua cấu hình AppConfig
        int port = AppConfig.getServerPort();
        System.out.println("[INFO] Đang cấu hình khởi tạo Web Server tại cổng " + port + "...");
        WebServer server = new WebServer(port, manager);

        try {
            server.start();
            
            System.out.println("--------------------------------------------------------------------------");
            System.out.println(" [XÁC NHẬN] MÁY CHỦ JAVA ĐANG CHẠY ỔN ĐỊNH VÀ PHỤC VỤ KẾT NỐI!");
            System.out.println(" Địa chỉ truy cập Giao diện Web Dashboard cực đẹp của bạn:");
            System.out.println(" 👉 http://localhost:" + port);
            System.out.println("--------------------------------------------------------------------------");
            System.out.println(" [HƯỚNG DẪN]: Nhấn tổ hợp phím Ctrl + C trong cửa sổ CMD này để dừng Server.");
            System.out.println("==========================================================================");
            
            // Giữ cho luồng chính không bị thoát để server tiếp tục phục vụ
            Object lock = new Object();
            synchronized (lock) {
                lock.wait();
            }
            
        } catch (IOException e) {
            System.err.println("[LỖI] Không thể khởi chạy Web Server Java: " + e.getMessage());
            e.printStackTrace();
        } catch (InterruptedException e) {
            System.out.println("[INFO] Server Java đã bị ngắt.");
            server.stop();
        }
    }
}
