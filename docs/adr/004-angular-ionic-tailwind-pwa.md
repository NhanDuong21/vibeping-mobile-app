# ADR 004 — PWA Angular/Ionic/Tailwind trên Màn hình chính

- **Trạng thái:** Đã chấp nhận cho V1; tại thời điểm lập ADR chưa triển khai. Việc tích hợp sau đó được ghi trong [sổ triển khai](../execution/BUILD_STATUS.md).
- **Quyết định:** Dùng Angular 22, Ionic Angular 9, Tailwind CSS, Signals, RxJS và PWA trên Màn hình chính; không đóng gói Capacitor.
- **Bối cảnh:** Cần nhận thông báo iPhone mà không phân phối qua Apple hoặc dùng hạ tầng trả phí.
- **Phương án đã cân nhắc:** Swift/TestFlight, Capacitor, PWA React/Vue, sản phẩm JavaScript thuần.
- **Hệ quả:** Cài lên Màn hình chính và giới hạn Web Push của iOS là điều kiện thiết kế. Ionic cung cấp cấu trúc nền tảng/điều hướng; giao diện riêng do dự án quyết định.
- **Kiểm chứng theo kế hoạch ban đầu:** Gate 0 tách kiểm tra origin/thông báo trước; kiểm thử ứng dụng nền tảng sau đó xác nhận tích hợp framework.
