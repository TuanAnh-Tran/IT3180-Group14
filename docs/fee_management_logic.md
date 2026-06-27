# Tài liệu Logic Nghiệp vụ Phân hệ Quản lý Thu Phí (Fee Management)

Phân hệ Quản lý Thu Phí được thiết kế đồng bộ từ Backend (Java Spring Boot) đến Frontend (Vanilla JS), trong đó backend và MySQL là nguồn dữ liệu chính. Khi backend mất kết nối, giao diện hiển thị lỗi kết nối để người dùng thử lại thay vì tự ghi dữ liệu nghiệp vụ trên trình duyệt.

---

## I. Cơ Cấu Cơ Sở Dữ Liệu (Data Models)

Các thực thể dữ liệu được định nghĩa và ánh xạ trong cơ sở dữ liệu:

1. **[Fee](../backend/src/main/java/com/cnpm/apartment/model/Fee.java)** (Khoản Phí)
   * Định nghĩa danh mục các loại phí trong chung cư.
   * Các trường quan trọng:
     * `type` (`MANDATORY` - Bắt buộc, `VOLUNTARY` - Tự nguyện).
     * `calcMethod` (Phương pháp tính phí: `FIXED`, `PER_PERSON`, `PER_M2`, `PER_VEHICLE`, `PER_MOTORCYCLE`, `PER_CAR`, `CONSUMPTION`).
     * `price` (Đơn giá của phí).
   * *Lưu ý*: Bảng này do phân hệ Quản lý Khoản Thu cập nhật, phân hệ Thu Phí chỉ đọc dữ liệu.

2. **[AssignedFee](../backend/src/main/java/com/cnpm/apartment/model/AssignedFee.java)** (Phí Đã Gán)
   * Bảng trung tâm của phân hệ Thu Phí, lưu vết thông tin nợ phí của từng hộ dân theo từng đợt thu.
   * Các trường quan trọng:
     * `household`: Khóa ngoại liên kết tới hộ gia đình.
     * `period`: Khóa ngoại liên kết tới đợt thu phí.
     * `fee`: Khóa ngoại liên kết tới loại phí.
     * `quantity`: Số lượng sử dụng (dành cho phí gửi xe, chỉ số tiêu dùng...).
     * `status` (`UNPAID` - Chưa nộp, `PARTIAL` - Nộp một phần, `PAID` - Đã nộp đủ).
     * `amountPaidAccumulated`: Số tiền lũy kế đã đóng cho khoản phí này.
     * `paidAt`: Thời điểm hoàn thành thanh toán.

3. **[Receipt](../backend/src/main/java/com/cnpm/apartment/model/Receipt.java)** (Biên Lai Thanh Toán)
   * Lưu lại chi tiết từng giao dịch đóng phí của cư dân.
   * Các trường quan trọng:
     * `assignedFee`: Liên kết tới khoản phí tương ứng.
     * `amountPaid`: Số tiền đóng của giao dịch này.
     * `paidAt`: Thời điểm nộp tiền.
     * `createdBy`: Tài khoản kế toán thực hiện thu phí.
     * `note`: Ghi chú giao dịch.

4. **[CollectionPeriod](../backend/src/main/java/com/cnpm/apartment/model/CollectionPeriod.java)** (Đợt Thu Phí)
   * Quản lý trạng thái đợt thu (`OPEN` - Đang mở, `CLOSED` - Đã đóng).

5. **[Household](../backend/src/main/java/com/cnpm/apartment/model/Household.java)** (Hộ Gia Đình)
   * Cung cấp các chỉ số tính phí: diện tích (`area`), số nhân khẩu (`membersCount`), số xe máy (`motorcycleCount`), số ô tô (`carCount`).

6. **[UtilityRecord](../backend/src/main/java/com/cnpm/apartment/model/UtilityRecord.java)** (Chỉ Số Điện Nước)
   * Lưu chỉ số cũ (`oldIndex`) và chỉ số mới (`newIndex`) theo tháng để tính phí tiêu dùng.

---

## II. Logic Tính Phí (Strategy Pattern)

Để đảm bảo tính linh hoạt khi mở rộng các phương pháp tính phí mới, hệ thống áp dụng **Strategy Pattern** tại Backend thông qua interface **[FeeCalculator](../backend/src/main/java/com/cnpm/apartment/service/calculator/FeeCalculator.java)** và **[CalculatorFactory](../backend/src/main/java/com/cnpm/apartment/service/calculator/CalculatorFactory.java)**.

Quy trình tính toán số tiền phải nộp (`amountRequired`) như sau:

| Phương pháp tính (`CalcMethod`) | Lớp xử lý | Công thức / Logic tính toán |
| :--- | :--- | :--- |
| **`FIXED`** | [FixedCalculator](../backend/src/main/java/com/cnpm/apartment/service/calculator/FixedCalculator.java) | • Nếu là nợ cũ (`FEE_DEBT`): `Đơn giá (1) * Số tiền nợ cũ (quantity)`<br>• Ngược lại: Bằng đơn giá cố định `price`. |
| **`PER_PERSON`** | [PerPersonCalculator](../backend/src/main/java/com/cnpm/apartment/service/calculator/PerPersonCalculator.java) | `Đơn giá * Số nhân khẩu của hộ gia đình` |
| **`PER_M2`** | [PerM2Calculator](../backend/src/main/java/com/cnpm/apartment/service/calculator/PerM2Calculator.java) | `Đơn giá * Diện tích căn hộ (m²)` |
| **`PER_MOTORCYCLE`** | [PerMotorcycleCalculator](../backend/src/main/java/com/cnpm/apartment/service/calculator/PerMotorcycleCalculator.java) | `Đơn giá * Số lượng xe máy của hộ gia đình` |
| **`PER_CAR`** | [PerCarCalculator](../backend/src/main/java/com/cnpm/apartment/service/calculator/PerCarCalculator.java) | `Đơn giá * Số lượng ô tô của hộ gia đình` |
| **`PER_VEHICLE`** | [PerVehicleCalculator](../backend/src/main/java/com/cnpm/apartment/service/calculator/PerVehicleCalculator.java) | `Đơn giá * Số lượng phương tiện (chung)` |
| **`CONSUMPTION`** | [ConsumptionCalculator](../backend/src/main/java/com/cnpm/apartment/service/calculator/ConsumptionCalculator.java) | • Tự động nhận diện loại điện/nước qua từ khóa tên phí (chứa chữ "water" -> `WATER`, ngược lại -> `ELECTRICITY`).<br>• Công thức: `Đơn giá * (Chỉ số mới - Chỉ số cũ)` lấy từ bảng `UtilityRecord`. |

---

## III. Nghiệp Vụ Cốt Lõi Tại Backend ([PaymentService.java](../backend/src/main/java/com/cnpm/apartment/service/PaymentService.java))

### 1. Ghi Nhận Thanh Toán (`recordPayment`)
* **Chống Race Condition**: Sử dụng cơ chế khóa bi quan **Pessimistic Write Lock (`findByIdForUpdate`)** khi truy vấn `AssignedFee` để đảm bảo không bị lỗi dữ liệu khi có nhiều giao dịch đồng thời từ người dân hoặc nhiều kế toán cùng mở một tài khoản.
* **Xử lý số tiền**:
  * Nếu số tiền nhập vào để trống hoặc `<= 0`, hệ thống mặc định thanh toán toàn bộ số tiền còn thiếu.
  * Nếu nộp thiếu so với tổng tiền phải đóng, trạng thái được đặt thành `PARTIAL`.
  * Nếu nộp đủ hoặc thừa, trạng thái chuyển sang `PAID` và cập nhật ngày thanh toán `paidAt`.
* **Ghi biên lai**: Mỗi giao dịch nộp tiền tạo ra một bản ghi `Receipt` ghi nhận số tiền đóng thực tế của đợt giao dịch đó, kèm tên nhân viên thu tiền lấy tự động từ Spring Security Context (`SecurityContextHolder`).

### 2. Quản Lý Nợ Lũy Kế & Tạo Đợt Thu Mới (`createPeriod`)
* Khi kế toán tạo một đợt thu phí mới (`CollectionPeriod`):
  1. Hệ thống thực hiện quét tất cả các khoản phí chưa hoàn thành (`UNPAID` hoặc `PARTIAL`) của các đợt cũ của từng hộ gia đình.
  2. Cộng dồn tất cả các khoản nợ này thành một số tiền duy nhất.
  3. Gán một khoản phí nợ cũ đặc biệt có mã `FEE_DEBT` vào đợt thu mới cho hộ gia đình đó, với trường `quantity` bằng chính số tiền nợ cũ lũy kế.
  4. Tự động gán các khoản phí bắt buộc mới (`MANDATORY`) và điền sẵn số lượng tự động từ thông tin hộ gia đình (số xe, diện tích, nhân khẩu).

---

## IV. Lịch Sử, Thống Kê & Báo Cáo

1. **Tra Cứu Lịch Sử ([ReceiptService.java](../backend/src/main/java/com/cnpm/apartment/service/ReceiptService.java))**
   * Cho phép lấy danh sách biên lai phân trang, lọc động theo hộ gia đình hoặc theo khoảng thời gian giao dịch (`from` - `to`).

2. **Thống Kê Doanh Thu ([StatisticsService.java](../backend/src/main/java/com/cnpm/apartment/service/StatisticsService.java))**
   * **Thống kê tổng quan**: Sử dụng tối ưu hóa câu lệnh SQL (Projection) để lấy tổng số tiền đã thu, số hộ hoàn thành, tỷ lệ hoàn thành thu phí toàn hệ thống.
   * **Thống kê theo tháng**: Phân nhóm doanh thu thực tế đã thu theo 12 tháng để vẽ biểu đồ doanh thu theo năm.
   * **Thống kê theo loại phí**: Tính tổng tiền thu theo phí bắt buộc (`COMPULSORY`) và tự nguyện (`VOLUNTARY`) để vẽ biểu đồ cơ cấu doanh thu.

3. **Xuất Báo Cáo Excel ([ExportService.java](../backend/src/main/java/com/cnpm/apartment/service/ExportService.java))**
   * Sử dụng thư viện **Apache POI** để sinh file Excel định dạng chuyên nghiệp tại server:
     * **Xuất biên lai theo đợt / thời gian**: Gồm thông tin hộ, tên phí, số tiền thực nộp, ngày nộp, kế toán viên và dòng tính tổng cộng cuối bảng.
     * **Xuất danh sách nợ**: Tổng hợp các căn hộ chưa đóng phí trong đợt thu kèm số tiền còn nợ.

---

## V. Xử Lý Phía Frontend (Javascript)

1. **API Client ([api.js](../frontend/js/api.js))**
   * Đóng gói các hàm gọi API đến Spring Boot thông qua hàm dùng chung `fetchJson()`.
   * Phương thức `checkHealth()` kiểm tra trạng thái hoạt động của backend bằng cách ping thử endpoint thống kê với thời gian timeout ngắn (1.5 giây).

2. **Giao Diện & Engine Phụ Trợ ([payment.js](../frontend/js/components/payment.js))**
   * **[PaymentEngine](../frontend/js/components/payment.js#L34)**: Triển khai logic tính phí (`calcAmount`) phục vụ hiển thị và kiểm tra nhanh trên giao diện; dữ liệu ghi nhận thanh toán vẫn phải đi qua Backend.
   * **Giao diện quản trị (PaymentView)**:
      * **Bộ lọc thông minh**: Lọc danh sách phí chưa thanh toán theo đợt thu và hộ gia đình. Tự động khóa bộ lọc và chỉ hiển thị căn hộ của chính cư dân đó nếu người dùng đăng nhập là cư dân thường (`user`).
      * **Bảo mật phân quyền thanh toán (Resident Authorization)**: Đối với cư dân thường (`role === 'user'`), giao diện chỉ hiển thị nút thanh toán **"Pay"** đối với các khoản phí thuộc về chính căn hộ/hộ gia đình của họ (`af.householdId === currentUser.room`). Các khoản phí thuộc hộ gia đình khác sẽ bị chặn và ẩn nút thanh toán, đảm bảo cư dân chỉ có thể xem và nộp các hóa đơn của chính mình.
      * **Vẽ biểu đồ thuần bằng Canvas**: Thay vì kéo các thư viện nặng ký như Chart.js, hệ thống vẽ biểu đồ cột (Monthly Revenue) và biểu đồ tròn (By Fee Type) trực tiếp lên thẻ `<canvas>` bằng HTML5 Canvas API giúp tối ưu hóa hiệu năng tải trang.
      * **Cơ chế đồng bộ giao diện**: Khi thực hiện thanh toán thành công qua API Backend, frontend tải lại dữ liệu liên quan để số dư và trạng thái trên các trang Dashboard hoặc Resident hiển thị đồng bộ mà không cần tải lại toàn bộ trang.
