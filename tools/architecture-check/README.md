# Công cụ kiểm tra kiến trúc

`check.ps1` kiểm tra quy tắc dựa trên tệp và thư mục; đây không phải trình biên dịch. Công cụ áp dụng giới hạn kích thước tệp và danh sách tên tệp bị cấm, đồng thời bỏ qua mã sinh tự động và mã bên thứ ba.

Chạy từ gốc repo:

```powershell
.\scripts\check-architecture.ps1
```

Chỉ thêm ngoại lệ vào `allowlist.json` khi có mẫu đường dẫn hẹp, lý do cụ thể và tham chiếu tới quyết định kiến trúc (ADR) hoặc người chịu trách nhiệm. Xem [quy định repo](../../AGENTS.md).
