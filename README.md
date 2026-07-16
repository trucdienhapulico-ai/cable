# Ultimate Cable Sizing Tool ⚡

**Ultimate Cable Sizing Tool** là một công cụ tính toán chọn tiết diện cáp, thiết bị bảo vệ (CB), hệ thống máng ống đỡ và quản lý cơ sở dữ liệu dự án chuyên nghiệp. Ứng dụng hoạt động trên nền tảng **Google Apps Script Web App** kết hợp với **Google Sheets** đóng vai trò làm cơ sở dữ liệu trung tâm.

Ứng dụng tuân thủ tiêu chuẩn quốc tế **IEC 60364-5-52** kết hợp các tiêu chuẩn thiết kế cơ điện hiện hành.

---

## 🌟 Tính năng chính

### 1. Tính toán & Đề xuất phương án cáp tối ưu
*   **Phương án Kinh tế (Economic - ECO):** Đề xuất tiết diện cáp tối ưu hóa giữa chi phí đầu tư ban đầu và chi phí hao hụt điện năng trong suốt vòng đời dự án (20 năm), giúp giảm thiểu phát thải và tiết kiệm tài chính dài hạn.
*   **Phương án Tiết kiệm/Tối thiểu (Min Size - FEW):** Đề xuất tiết diện cáp nhỏ nhất đáp ứng đầy đủ điều kiện phát nóng (dòng điện định mức liên tục) và giới hạn sụt áp cho phép.
*   **Phương án Dự phòng/Thay thế (Backup - BACK):** Cung cấp thêm phương án dự phòng (lớn hơn 1 cấp tiết diện) để người thiết kế linh hoạt lựa chọn.

### 2. Thiết kế hệ thống phụ trợ & bảo vệ
*   **Tính chọn Aptomat (Circuit Breaker):** Tự động tính toán dòng định mức ($I_n$) của CB bảo vệ phù hợp với dòng tải và dòng cho phép của cáp ($I_z$).
*   **Tính chọn Ống luồn dây (Conduit):** Tính toán đường kính trong tối thiểu của ống luồn dựa trên tổng đường kính ngoài của bó cáp và hệ số điền đầy tiêu chuẩn.
*   **Tính chọn Máng cáp (Cable Tray):** Tính toán chiều rộng và chiều cao máng cáp tối thiểu khi đi nhiều tuyến cáp song song chung máng.

### 3. Quản lý dự án & Cơ sở dữ liệu đồng bộ
*   **Quản lý nhiều tuyến cáp:** Lưu trữ, tìm kiếm, sửa đổi và xuất dữ liệu các tuyến cáp đã tính toán trực tiếp lên Google Sheets.
*   **Phân loại theo dự án:** Hỗ trợ quản lý độc lập các tuyến cáp thuộc nhiều dự án khác nhau.
*   **Danh mục kỹ thuật (Catalogs):** Quản lý động các bảng tra cứu hệ số nhiệt độ, hệ số nhóm, catalogue cáp, catalogue CB, catalogue ống/máng trực tiếp thông qua Google Sheets mà không cần sửa đổi mã nguồn.

### 4. Báo cáo & Dashboard phân tích trực quan
*   Thống kê tổng số tuyến cáp, tổng chiều dài cáp của toàn bộ dự án.
*   Ước lượng tổng khối lượng kim loại màu sử dụng (Đồng - Cu, Nhôm - Al) để phục vụ công tác bóc tách khối lượng và dự toán.
*   Biểu đồ phân bổ trạng thái thi công và phân bổ dự án trực quan.
*   Tự động lọc danh sách cảnh báo đối với các tuyến cáp có độ sụt áp cao (>3%), số sợi song song nhiều hoặc tiết diện cáp lớn (>120 mm²).

---

## 🛠️ Công nghệ sử dụng
*   **Frontend:** HTML5, CSS3 (Giao diện Dark Mode hiện đại, responsive hoàn toàn trên PC và Mobile), JavaScript (ES6+).
*   **Backend:** Google Apps Script (V8 Engine) - Xử lý tính toán logic, điều hướng và kết nối APIs.
*   **Database:** Google Sheets (Cơ sở dữ liệu đám mây thời gian thực).
*   **Quản lý & Triển khai:** `@google/clasp` (Command Line Apps Script Projects).

---

## 📂 Cấu trúc mã nguồn
```bash
cable/
├── .gitignore                      # Cấu hình bỏ qua các tệp tạm của Git
├── README.md                       # Tài liệu hướng dẫn sử dụng dự án
├── Ultimate Cable Sizing...docx    # Tài liệu yêu cầu kỹ thuật gốc
└── cable-apps-script-webapp/       # Thư mục mã nguồn chính Apps Script
    ├── appsscript.json             # File cấu hình hệ thống Apps Script (Manifest)
    ├── Code.gs                     # Logic Backend: Khởi tạo DB, Đọc/Ghi Sheets, Routing
    ├── Index.html                  # Giao diện khung (HTML Layout)
    ├── Styles.html                 # Giao diện chi tiết (CSS & Theme)
    └── JavaScript.html             # Logic Frontend: Tính toán sụt áp, tương tác UI
```

---

## 🚀 Hướng dẫn cài đặt & Triển khai

### 1. Chuẩn bị
*   Tạo một Google Spreadsheet mới trên Google Drive của bạn. Ghi lại **Spreadsheet ID** (chuỗi ký tự nằm giữa `/d/` và `/edit` trên thanh địa chỉ URL).
*   Mở tệp [Code.gs](file:///d:/KHONG_XOA/cable/cable-apps-script-webapp/Code.gs) và thay thế giá trị hằng số `SPREADSHEET_ID` ở dòng đầu tiên bằng ID Spreadsheet của bạn:
    ```javascript
    const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
    ```

### 2. Đẩy mã nguồn lên Apps Script bằng clasp
Nếu bạn sử dụng clasp để quản lý mã nguồn ngoại tuyến:
1.  Khởi tạo dự án clasp và liên kết với file Apps Script của bạn:
    ```bash
    clasp clone <SCRIPT_ID>
    ```
2.  Đẩy mã nguồn cục bộ lên Apps Script:
    ```bash
    clasp push -f
    ```
3.  Triển khai Web App:
    ```bash
    clasp deploy --description "Production Web App"
    ```

### 3. Tự động khởi tạo dữ liệu
Khi chạy ứng dụng Web App lần đầu tiên, hàm `initializeSheets()` trong [Code.gs](file:///d:/KHONG_XOA/cable/cable-apps-script-webapp/Code.gs) sẽ tự động kiểm tra và khởi tạo **10 Sheets** cấu trúc dữ liệu cơ sở nếu chúng chưa tồn tại trong Google Sheet của bạn:
*   `Projects`, `CableCatalog`, `BreakerCatalog`, `ConduitCatalog`, `CableTrayCatalog`, `TemperatureFactor`, `GroupingFactor`, `Settings`, `CalculatedRoutes`, `SystemLogs`.

Ứng dụng cũng sẽ tự động nạp sẵn dữ liệu mẫu chuẩn của các hệ số hiệu chỉnh, thư viện cáp Cadivi, thiết bị đóng cắt LS/Schneider để bạn có thể sử dụng tính toán được ngay lập tức.
