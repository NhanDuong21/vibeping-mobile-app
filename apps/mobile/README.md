# Ứng dụng iPhone của VibePing

Thư mục này chứa PWA Angular/Ionic được thêm vào Màn hình chính iPhone. Ứng dụng hiển thị hoạt động Codex, hạn mức, trạng thái laptop và cài đặt. SQLite trên Windows giữ dữ liệu chính; IndexedDB trên điện thoại chỉ lưu bản đệm.

## Công nghệ và cách tổ chức

- Angular 22, Ionic Angular 9, Tailwind CSS; phiên bản cụ thể được khóa trong `package.json` và `pnpm-lock.yaml`.
- Tính năng nằm trong `src/app/features/`. Trang chỉ nối trạng thái với tương tác; nghiệp vụ, mạng và lưu trữ nằm ngoài trang.
- Signals quản lý trạng thái giao diện; RxJS quản lý luồng và tác vụ bất đồng bộ.
- Kiểu dữ liệu API lấy từ `contracts/generated/api.ts` ở gốc repo; không sửa tay tệp này.

## Chạy từ mã nguồn

Máy phát triển cần Node.js, pnpm theo `packageManager` của repo, Rust theo `rust-toolchain.toml` và bộ công cụ biên dịch MSVC trên Windows. Các lệnh dưới đây chạy từ **thư mục gốc repo**.

Sinh hợp đồng API và chạy ứng dụng cùng máy chủ phát triển:

```powershell
pnpm run generate:contracts
.\scripts\dev.ps1
```

Chỉ mở máy chủ phát triển Angular tại `http://localhost:4200/`:

```powershell
pnpm --filter vibeping-mobile start
```

Angular tự tải lại khi mã nguồn thay đổi. Lệnh này chỉ phục vụ giao diện; để kiểm tra đầy đủ API và tích hợp máy chủ, dùng quy trình phát triển hoặc bản phát hành của repo.

## Biên dịch và kiểm thử

```powershell
pnpm run build:mobile
pnpm run lint
pnpm run typecheck
pnpm run test:mobile
```

Bản biên dịch dùng cấu hình Angular của dự án, bao gồm bước xử lý Tailwind. Kiểm thử đơn vị dùng Vitest. Bộ kiểm thử trình duyệt dùng Playwright ở `tests/e2e/`, chạy qua script của repo:

```powershell
pnpm run build:release
pnpm run e2e
```

Để chạy toàn bộ các bước bắt buộc trước bàn giao, dùng `.\scripts\check.ps1`. Xem [chiến lược kiểm thử](../../docs/TEST_STRATEGY.md) và [quy định repo](../../AGENTS.md).
