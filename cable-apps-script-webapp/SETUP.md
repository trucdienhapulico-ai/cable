# Triển khai Google Apps Script Web App

Google Sheet đã gắn sẵn:
https://docs.google.com/spreadsheets/d/1TD2JsMVwRk0KXUCPbtRiKF4UePzfyiw5LX5FKzJwlHU/edit

## Thao tác một lần trên điện thoại

1. Mở Google Sheet.
2. Chọn **Tiện ích mở rộng → Apps Script**.
3. Tạo các tệp:
   - `Code.gs`
   - `Index.html`
   - `Styles.html`
   - `JavaScript.html`
4. Dán nội dung tương ứng từ bộ mã này.
5. Lưu dự án.
6. Chọn **Deploy → New deployment → Web app**.
7. Execute as: **Me**.
8. Chọn quyền truy cập phù hợp.
9. Deploy và mở URL `/exec`.

## Các lần thay đổi tiếp theo

- Thay bảng dòng cáp, hệ số, ống luồn, giới hạn sụt áp: sửa trực tiếp trong Google Sheet, không deploy lại.
- Thay công thức hoặc giao diện: sửa file Apps Script, sau đó **Deploy → Manage deployments → Edit → New version**. Link web giữ nguyên.
