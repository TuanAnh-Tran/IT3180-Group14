package com.fee.system.web;

import com.fee.system.models.*;
import com.fee.system.services.FeeManager;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * LỚP MÁY CHỦ WEB SERVER JAVA (WEB INTERFACE LAYER - WEBSERVER)
 * Sử dụng thư viện HttpServer có sẵn của JDK. Phụ trách:
 * - Định tuyến và phân phối tệp giao diện tĩnh (HTML, CSS, JS) cho Trình duyệt.
 * - Cung cấp các REST API trao đổi dữ liệu định dạng JSON để Frontend tương tác thời gian thực.
 * - Giải thuật thủ công chuyển đổi Java Objects sang JSON và ngược lại (Zero-dependency JSON).
 */
public class WebServer {
    private final int port;             // Cổng mạng lắng nghe (Mặc định: 8080)
    private final FeeManager manager;   // Tham chiếu đến bộ xử lý nghiệp vụ chính
    private HttpServer server;

    /**
     * Khởi tạo cấu hình máy chủ Web
     * @param port Cổng mạng
     * @param manager Bộ quản lý nghiệp vụ
     */
    public WebServer(int port, FeeManager manager) {
        this.port = port;
        this.manager = manager;
    }

    /**
     * Khởi chạy máy chủ HTTP Server
     */
    public void start() throws IOException {
        // Tạo máy chủ HttpServer lắng nghe tại cổng mạng và địa chỉ bất kỳ (wildcard)
        server = HttpServer.create(new InetSocketAddress(port), 0);
        
        // Đăng ký bộ định tuyến chính cho gốc "/" của website
        server.createContext("/", new MainRouterHandler());
        
        server.setExecutor(null); // Sử dụng luồng mặc định
        server.start();
        System.out.println("[SUCCESS] Web Server Java đã khởi động tại: http://localhost:" + port);
    }

    /**
     * Dừng máy chủ
     */
    public void stop() {
        if (server != null) {
            server.stop(0);
            System.out.println("[INFO] Web Server Java đã dừng.");
        }
    }

    /**
     * BỘ ĐỊNH TUYẾN CHÍNH (MAIN ROUTER HANDLER)
     * Đóng vai trò là cổng tiếp nhận (Controller) chặn lọc toàn bộ các yêu cầu gửi đến.
     */
    private class MainRouterHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath(); // Đường dẫn yêu cầu (VD: /api/fees, /index.html)
            String method = exchange.getRequestMethod();      // Phương thức HTTP (GET, POST, PUT, DELETE,...)
            
            // THIẾT LẬP CORS HEADERS (Bảo mật chia sẻ tài nguyên nguồn gốc chéo):
            // Cho phép các trình duyệt gọi API trực tiếp từ localhost khác mà không bị chặn bảo mật
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");

            // Trả về thành công ngay lập tức cho các yêu cầu duyệt thử OPTIONS của trình duyệt (Pre-flight requests)
            if ("OPTIONS".equalsIgnoreCase(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                // ==========================================================
                // PHÂN HỆ 1: PHÂN PHỐI TỆP GIAO DIỆN TĨNH (STATIC PORTAL)
                // ==========================================================
                if (path.equals("/") || path.equals("/index.html")) {
                    serveStaticFile(exchange, "index.html", "text/html; charset=utf-8");
                    return;
                } else if (path.equals("/styles.css")) {
                    serveStaticFile(exchange, "styles.css", "text/css; charset=utf-8");
                    return;
                } else if (path.equals("/app.js")) {
                    serveStaticFile(exchange, "app.js", "application/javascript; charset=utf-8");
                    return;
                }

                // ==========================================================
                // PHÂN HỆ 2: ĐỊNH TUYẾN REST API (RESTFUL API CONSOLE)
                // ==========================================================
                if (path.startsWith("/api/")) {
                    handleAPI(exchange, path, method);
                    return;
                }

                // 404 Không tìm thấy tài nguyên
                sendTextResponse(exchange, 404, "404 Not Found - Không tìm thấy trang yêu cầu.");

            } catch (Exception e) {
                e.printStackTrace();
                sendTextResponse(exchange, 500, "500 Internal Server Error: " + e.getMessage());
            }
        }
    }

    /**
     * Đọc tệp tĩnh trên đĩa cứng và gửi về cho trình duyệt hiển thị
     */
    private void serveStaticFile(HttpExchange exchange, String fileName, String contentType) throws IOException {
        // Chỉ định đường dẫn tệp tĩnh lưu trữ tại src/com/fee/system/public/
        String filePath = "src/com/fee/system/public/" + fileName;
        File file = new File(filePath);

        if (!file.exists()) {
            sendTextResponse(exchange, 404, "404 File Not Found - Không tìm thấy tệp giao diện: " + fileName);
            return;
        }

        // Đọc toàn bộ tệp thành mảng bytes và gửi về trình duyệt kèm mã hóa tiêu chuẩn
        byte[] content = Files.readAllBytes(Paths.get(filePath));
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(200, content.length);
        OutputStream os = exchange.getResponseBody();
        os.write(content);
        os.close();
    }

    /**
     * BỘ PHÂN PHỐI API (API ENDPOINT DISPATCHER)
     * Trực tiếp giao tiếp với FeeManager, chuyển hóa yêu cầu của trình duyệt thành lệnh gọi hàm Java
     * và biến đổi kết quả trả về thành dạng chuỗi JSON thô gửi ngược lại Browser.
     */
    private void handleAPI(HttpExchange exchange, String path, String method) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        String responseJson = "{}"; // Chuỗi JSON trả về
        int statusCode = 200;      // HTTP Status Code mặc định thành công

        String query = exchange.getRequestURI().getQuery(); // Tham số URL (VD: ?periodId=PER_1)
        String body = readRequestBody(exchange);            // Đọc Request body (JSON gửi từ Browser)

        try {
            // A. PHÂN NHÓM REST API CHO KHOẢN THU (FEES API)
            if (path.equals("/api/fees")) {
                if ("GET".equalsIgnoreCase(method)) {
                    // Lấy danh sách phí, biến đổi toàn bộ sang chuỗi JSON và trả về
                    responseJson = feesToJson(manager.getFees());
                } 
                else if ("POST".equalsIgnoreCase(method)) {
                    // Phân tách chuỗi JSON thô gửi từ client để lấy các trường dữ liệu
                    String name = getJsonField(body, "name");
                    Fee.FeeType type = Fee.FeeType.valueOf(getJsonField(body, "type"));
                    Fee.CalcMethod calcMethod = Fee.CalcMethod.valueOf(getJsonField(body, "calcMethod"));
                    double price = Double.parseDouble(getJsonField(body, "price"));

                    // Gọi lớp nghiệp vụ Java để khởi tạo
                    Fee newFee = manager.createFee(name, type, calcMethod, price);
                    responseJson = feeToJson(newFee);
                    statusCode = 201; // Created
                } 
                else if ("PUT".equalsIgnoreCase(method)) {
                    // Sửa thông tin phí
                    String id = getJsonField(body, "id");
                    String name = getJsonField(body, "name");
                    Fee.FeeType type = Fee.FeeType.valueOf(getJsonField(body, "type"));
                    Fee.CalcMethod calcMethod = Fee.CalcMethod.valueOf(getJsonField(body, "calcMethod"));
                    double price = Double.parseDouble(getJsonField(body, "price"));

                    Fee updatedFee = manager.updateFee(id, name, type, calcMethod, price);
                    if (updatedFee != null) {
                        responseJson = feeToJson(updatedFee);
                    } else {
                        statusCode = 404;
                        responseJson = "{\"error\":\"Không tìm thấy khoản thu để sửa\"}";
                    }
                } 
                else if ("DELETE".equalsIgnoreCase(method)) {
                    // Xóa phí
                    String id = getQueryParam(query, "id");
                    boolean success = manager.deleteFee(id);
                    if (success) {
                        responseJson = "{\"success\":true}";
                    } else {
                        statusCode = 404;
                        responseJson = "{\"error\":\"Không tìm thấy khoản thu để xóa\"}";
                    }
                }
            }

            // B. PHÂN NHÓM REST API CHO ĐỢT THU (PERIODS API)
            else if (path.equals("/api/periods")) {
                if ("GET".equalsIgnoreCase(method)) {
                    responseJson = periodsToJson(manager.getPeriods());
                } 
                else if ("POST".equalsIgnoreCase(method)) {
                    String name = getJsonField(body, "name");
                    List<String> feeIds = getJsonArrayField(body, "feeIds"); // Parse mảng string JSON

                    CollectionPeriod newPeriod = manager.createPeriod(name, feeIds);
                    responseJson = periodToJson(newPeriod);
                    statusCode = 201;
                }
            } 
            else if (path.equals("/api/periods/close")) {
                if ("POST".equalsIgnoreCase(method)) {
                    String id = getJsonField(body, "id");
                    manager.closePeriod(id);
                    responseJson = "{\"success\":true}";
                }
            }

            // C. PHÂN NHÓM REST API CHO HỘ DÂN (HOUSEHOLDS API)
            else if (path.equals("/api/households")) {
                if ("GET".equalsIgnoreCase(method)) {
                    // Logic ghép nối: Lấy danh sách hộ dân và tính toán hóa đơn tự động lồng bên trong
                    String periodId = getQueryParam(query, "periodId");
                    responseJson = householdsWithBillToJson(manager.getHouseholds(), periodId);
                } 
                else if ("POST".equalsIgnoreCase(method)) {
                    String id = getJsonField(body, "id").trim().toUpperCase();
                    String ownerName = getJsonField(body, "ownerName");
                    int members = Integer.parseInt(getJsonField(body, "membersCount"));
                    double area = Double.parseDouble(getJsonField(body, "area"));
                    
                    String motoVal = getJsonField(body, "motorcycleCount");
                    int motorcycleCount = motoVal.isEmpty() ? 0 : Integer.parseInt(motoVal);
                    
                    String carVal = getJsonField(body, "carCount");
                    int carCount = carVal.isEmpty() ? 0 : Integer.parseInt(carVal);

                    try {
                        Household hh = manager.createHousehold(id, ownerName, members, area, motorcycleCount, carCount);
                        responseJson = householdToJson(hh);
                        statusCode = 201;
                    } catch (IllegalArgumentException e) {
                        statusCode = 400; // Client Error
                        responseJson = "{\"error\":\"" + e.getMessage() + "\"}";
                    }
                }
            }

            // D. PHÂN NHÓM REST API XEM HÓA ĐƠN CHI TIẾT CỦA CĂN HỘ (INVOICE API)
            else if (path.equals("/api/bill")) {
                if ("GET".equalsIgnoreCase(method)) {
                    String hhId = getQueryParam(query, "householdId");
                    String pId = getQueryParam(query, "periodId");
                    
                    FeeManager.HouseholdBill bill = manager.calculateHouseholdBill(hhId, pId);
                    responseJson = householdBillToJson(bill);
                }
            }

            // E. PHÂN NHÓM REST API PHÂN BỔ PHÍ / ĐO TIÊU THỤ NƯỚC (ASSIGN FEE API)
            else if (path.equals("/api/assign")) {
                if ("POST".equalsIgnoreCase(method)) {
                    String hhId = getJsonField(body, "householdId");
                    String pId = getJsonField(body, "periodId");
                    String feeId = getJsonField(body, "feeId");
                    double quantity = Double.parseDouble(getJsonField(body, "quantity"));

                    AssignedFee af = manager.assignFeeToHousehold(hhId, pId, feeId, quantity);
                    responseJson = assignedFeeToJson(af);
                }
            }

            // HỦY PHÂN BỔ GÁN PHÍ
            else if (path.equals("/api/unassign")) {
                if ("POST".equalsIgnoreCase(method)) {
                    String hhId = getJsonField(body, "householdId");
                    String pId = getJsonField(body, "periodId");
                    String feeId = getJsonField(body, "feeId");

                    boolean success = manager.unassignFeeFromHousehold(hhId, pId, feeId);
                    responseJson = "{\"success\":" + success + "}";
                }
            }

            // F. PHÂN NHÓM REST API GHI NHẬN NỘP TIỀN / HOÀN TÁC (PAYMENT API)
            else if (path.equals("/api/pay")) {
                if ("POST".equalsIgnoreCase(method)) {
                    String asfId = getJsonField(body, "assignedFeeId");
                    boolean success = manager.payAssignedFee(asfId);
                    responseJson = "{\"success\":" + success + "}";
                }
            } 
            else if (path.equals("/api/unpay")) {
                if ("POST".equalsIgnoreCase(method)) {
                    String asfId = getJsonField(body, "assignedFeeId");
                    boolean success = manager.unpayAssignedFee(asfId);
                    responseJson = "{\"success\":" + success + "}";
                }
            }

            // G. PHÂN NHÓM REST API THỐNG KÊ TIẾN ĐỘ ĐỢT THU (DASHBOARD STATS API)
            else if (path.equals("/api/stats")) {
                if ("GET".equalsIgnoreCase(method)) {
                    String periodId = getQueryParam(query, "periodId");
                    // Tính toán dòng tài chính trong FeeManager
                    FeeManager.PeriodStats stats = manager.calculatePeriodStats(periodId);
                    responseJson = periodStatsToJson(stats);
                }
            }

            // H. REST API LẤY THÔNG TIN CHUNG CƯ CẤU HÌNH (BUILDING INFO API)
            else if (path.equals("/api/building")) {
                if ("GET".equalsIgnoreCase(method)) {
                    String name = com.fee.system.config.AppConfig.getProperty("building.name", "Chung cư BlueMoon");
                    String location = com.fee.system.config.AppConfig.getProperty("building.location", "Ngã tư Văn Phú");
                    String yearStart = com.fee.system.config.AppConfig.getProperty("building.year.start", "2021");
                    String yearEnd = com.fee.system.config.AppConfig.getProperty("building.year.end", "2023");
                    String description = com.fee.system.config.AppConfig.getProperty("building.description", "");
                    double area = com.fee.system.config.AppConfig.getDoubleProperty("building.area", 450.0);
                    int floors = (int) com.fee.system.config.AppConfig.getDoubleProperty("building.floors", 30);
                    String structure = com.fee.system.config.AppConfig.getProperty("building.structure", "30 tầng");
                    
                    responseJson = String.format("{\"name\":\"%s\",\"location\":\"%s\",\"yearStart\":\"%s\",\"yearEnd\":\"%s\",\"description\":\"%s\",\"area\":%.1f,\"floors\":%d,\"structure\":\"%s\"}",
                            name, location, yearStart, yearEnd, description, area, floors, structure);
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            statusCode = 400;
            responseJson = "{\"error\":\"Dữ liệu gửi lên sai định dạng: " + e.getMessage() + "\"}";
        }

        // Chuyển chuỗi JSON sang mảng Bytes dạng UTF-8 và gửi trả về trình duyệt
        byte[] resBytes = responseJson.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, resBytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(resBytes);
        os.close();
    }

    // ==========================================================================
    // 5. GIẢI THUẬT CHUYỂN ĐỔI JAVA OBJECTS SANG JSON THÔ (JSON SERIALIZERS)
    // ==========================================================================

    private static String feeToJson(Fee f) {
        return String.format("{\"id\":\"%s\",\"name\":\"%s\",\"type\":\"%s\",\"calcMethod\":\"%s\",\"price\":%.0f}",
                f.getId(), f.getName(), f.getType().name(), f.getCalcMethod().name(), f.getPrice());
    }

    private static String feesToJson(List<Fee> list) {
        return "[" + list.stream().map(WebServer::feeToJson).collect(Collectors.joining(",")) + "]";
    }

    private static String periodToJson(CollectionPeriod p) {
        String fees = "[" + p.getFeeIds().stream().map(id -> "\"" + id + "\"").collect(Collectors.joining(",")) + "]";
        return String.format("{\"id\":\"%s\",\"name\":\"%s\",\"feeIds\":%s,\"status\":\"%s\",\"createdAt\":\"%s\"}",
                p.getId(), p.getName(), fees, p.getStatus().name(), p.getCreatedAt().toString());
    }

    private static String periodsToJson(List<CollectionPeriod> list) {
        return "[" + list.stream().map(WebServer::periodToJson).collect(Collectors.joining(",")) + "]";
    }

    private static String householdToJson(Household h) {
        return String.format("{\"id\":\"%s\",\"ownerName\":\"%s\",\"membersCount\":%d,\"area\":%.1f,\"motorcycleCount\":%d,\"carCount\":%d}",
                h.getId(), h.getOwnerName(), h.getMembersCount(), h.getArea(), h.getMotorcycleCount(), h.getCarCount());
    }

    private static String assignedFeeToJson(AssignedFee af) {
        String paidAtStr = af.getPaidAt() != null ? "\"" + af.getPaidAt().toString() + "\"" : "null";
        return String.format("{\"id\":\"%s\",\"householdId\":\"%s\",\"periodId\":\"%s\",\"feeId\":\"%s\",\"quantity\":%.1f,\"status\":\"%s\",\"paidAt\":%s}",
                af.getId(), af.getHouseholdId(), af.getPeriodId(), af.getFeeId(), af.getQuantity(), af.getStatus().name(), paidAtStr);
    }

    private static String billItemToJson(FeeManager.BillItem item) {
        String paidAtStr = item.getPaidAt() != null ? "\"" + item.getPaidAt().toString() + "\"" : "null";
        return String.format("{\"assignedFeeId\":\"%s\",\"feeId\":\"%s\",\"feeName\":\"%s\",\"feeType\":\"%s\",\"calcMethod\":\"%s\",\"price\":%.0f,\"quantity\":%.1f,\"amount\":%.0f,\"status\":\"%s\",\"paidAt\":%s}",
                item.getAssignedFeeId(), item.getFeeId(), item.getFeeName(), item.getFeeType().name(),
                item.getCalcMethod().name(), item.getPrice(), item.getQuantity(), item.getAmount(), item.getStatus().name(), paidAtStr);
    }

    private static String householdBillToJson(FeeManager.HouseholdBill b) {
        String items = "[" + b.getItems().stream().map(WebServer::billItemToJson).collect(Collectors.joining(",")) + "]";
        return String.format("{\"householdId\":\"%s\",\"ownerName\":\"%s\",\"membersCount\":%d,\"area\":%.1f,\"items\":%s,\"totalAmount\":%.0f,\"totalPaid\":%.0f,\"totalUnpaid\":%.0f}",
                b.getHouseholdId(), b.getOwnerName(), b.getMembersCount(), b.getArea(), items, b.getTotalAmount(), b.getTotalPaid(), b.getTotalUnpaid());
    }

    private String householdsWithBillToJson(List<Household> hList, String periodId) {
        return "[" + hList.stream().map(h -> {
            FeeManager.HouseholdBill b = manager.calculateHouseholdBill(h.getId(), periodId);
            return String.format("{\"id\":\"%s\",\"ownerName\":\"%s\",\"membersCount\":%d,\"area\":%.1f,\"calculatedBill\":%s}",
                    h.getId(), h.getOwnerName(), h.getMembersCount(), h.getArea(), householdBillToJson(b));
        }).collect(Collectors.joining(",")) + "]";
    }

    private static String periodStatsToJson(FeeManager.PeriodStats s) {
        return String.format("{\"periodId\":\"%s\",\"periodName\":\"%s\",\"totalExpected\":%.0f,\"totalCollected\":%.0f,\"totalRemaining\":%.0f,\"completionRate\":%d,\"totalAssignments\":%d,\"paidAssignments\":%d}",
                s.getPeriodId(), s.getPeriodName(), s.getTotalExpected(), s.getTotalCollected(), s.getTotalRemaining(), s.getCompletionRate(), s.getTotalAssignments(), s.getPaidAssignments());
    }

    // ==========================================================================
    // 6. GIẢI THUẬT PARSE TRUY VẤN JSON BẰNG REGEX (ZERO-DEPENDENCY PARSERS)
    // ==========================================================================

    /**
     * Phân tích cú pháp chuỗi JSON thô gửi từ trình duyệt và trích xuất giá trị trường tương ứng.
     * Thuật toán: Tìm cặp khóa "field" và trích xuất chuỗi trong ngoặc kép hoặc số ở vế sau.
     */
    private static String getJsonField(String json, String field) {
        Pattern pattern = Pattern.compile("\"" + field + "\"\\s*:\\s*(?:\"([^\"]*)\"|([^,}]*))");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            String val1 = matcher.group(1);
            if (val1 != null) return val1;
            String val2 = matcher.group(2);
            if (val2 != null) return val2.trim();
        }
        return "";
    }

    /**
     * Phân tích cú pháp mảng các chuỗi bên trong JSON và trả về một List<String>
     * Thuật toán: Tìm mảng dạng "field": [...] sau đó quét lấy tất cả các phần tử trong ngoặc kép.
     */
    private static List<String> getJsonArrayField(String json, String field) {
        List<String> list = new ArrayList<>();
        Pattern pattern = Pattern.compile("\"" + field + "\"\\s*:\\s*\\[([^\\]]*)\\]");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            String arrayStr = matcher.group(1);
            Pattern itemPattern = Pattern.compile("\"([^\"]*)\"");
            Matcher itemMatcher = itemPattern.matcher(arrayStr);
            while (itemMatcher.find()) {
                list.add(itemMatcher.group(1));
            }
        }
        return list;
    }

    /**
     * Phân tách tham số Query Parameter từ URL (VD: ?id=FEE_1&periodId=PER_1)
     */
    private static String getQueryParam(String query, String paramName) {
        if (query == null || query.isEmpty()) return "";
        try {
            for (String param : query.split("&")) {
                String[] entry = param.split("=");
                if (entry.length > 1 && entry[0].equalsIgnoreCase(paramName)) {
                    return URLDecoder.decode(entry[1], StandardCharsets.UTF_8.toString());
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return "";
    }

    /**
     * Đọc toàn bộ Request Body gửi từ Client thành một chuỗi văn bản thô
     */
    private static String readRequestBody(HttpExchange exchange) throws IOException {
        InputStream is = exchange.getRequestBody();
        BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        return reader.lines().collect(Collectors.joining("\n"));
    }

    /**
     * Trả về văn bản thuần với mã lỗi HTTP chỉ định
     */
    private void sendTextResponse(HttpExchange exchange, int status, String text) throws IOException {
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }
}
