# Kiến trúc VibePing

Ứng dụng gồm PWA trên iPhone và tiến trình Rust/SQLite trên Windows. `apps/mobile` và `apps/desktop` là mã sản phẩm; Gate 0 và Gate 1 là các bản thử nghiệm độc lập để kiểm tra lại tích hợp.

## Nhìn tổng thể

```text
PWA trên Màn hình chính iPhone
  ├─ REST: lấy dữ liệu và gửi yêu cầu khi mở ứng dụng
  ├─ SSE: nhận cập nhật trực tiếp khi ứng dụng đang mở
  ├─ Web Push: nhận thông báo khi chạy nền
  └─ IndexedDB: bộ nhớ đệm có thể dựng lại
          │ HTTPS riêng trong mạng Tailscale
          ▼
Tailscale Serve (.ts.net, tuyệt đối không dùng Funnel)
          │ chuyển tiếp tới 127.0.0.1
          ▼
Ứng dụng Rust chia mô-đun trên Windows
  ├─ xử lý hoạt động và quy tắc thông báo
  ├─ hàng đợi gửi bền vững, có thử lại
  ├─ kết nối Codex
  ├─ phục vụ REST/SSE/Web Push
  └─ SQLite: nguồn dữ liệu chính
          │ stdio của tiến trình con, JSONL/JSON-RPC
          ▼
codex app-server → dịch vụ Codex đã đăng nhập
```

## Ranh giới tin cậy

1. PWA ít được tin cậy hơn dữ liệu Windows: chỉ nhận dữ liệu cần thiết và không được chạy lệnh từ xa.
2. Tailscale xác thực thành viên mạng riêng và xử lý HTTPS. Điều này không làm mọi tiến trình gọi localhost trở nên đáng tin.
3. Tiến trình Rust kiểm tra yêu cầu và sở hữu việc lưu trữ.
4. `codex app-server` quản lý đăng nhập Codex. VibePing chỉ xử lý thông điệp giao thức, không xử lý thông tin đăng nhập.
5. Dịch vụ Web Push chuyển tiếp nội dung mã hóa. Dữ liệu đăng ký nhận thông báo vẫn là dữ liệu nhạy cảm cục bộ.

## Trách nhiệm từng phần

| Thành phần                  | Trách nhiệm                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Giao diện mobile            | Hiển thị trạng thái tiếng Việt; chỉ xin quyền sau thao tác người dùng; lưu bản đệm và kết nối lại.                                                                         |
| Các ca sử dụng              | Xác định sự kiện, mức cần chú ý, trạng thái hạn mức, chính sách thử lại và kết quả API.                                                                                    |
| Store SQLite theo tính năng | Giữ thông tin khởi tạo, ghép nối, chủ sở hữu/thiết bị, đăng ký thông báo, hoạt động, lượt Codex, hàng đợi và lần gửi, hạn mức, cài đặt.                                    |
| Bộ kết nối Codex            | Chuẩn hóa tín hiệu từ notify/hook đã được duyệt; đọc hạn mức qua App Server.                                                                                               |
| Bộ kết nối gửi/nhận         | Phục vụ REST/SSE, mã hóa Web Push; giữ chi tiết nhà cung cấp ngoài nghiệp vụ.                                                                                              |
| Quản lý tiến trình Windows  | Chạy/dừng/khởi động lại, khóa ngăn chạy trùng, lưu ý định người dùng, điều khiển nội bộ có token, kiểm tra Tailscale, nhật ký luân phiên, hàng chờ khi lỗi và tắt an toàn. |

## Dữ liệu khi ứng dụng đang mở

PWA lấy bản trạng thái qua REST từ Windows, thay bộ đệm IndexedDB cũ rồi đăng ký SSE. Khi mất kết nối, ứng dụng chờ tăng dần giữa các lần thử và lấy lại trạng thái REST trước khi tiếp tục nhận sự kiện.

REST xử lý yêu cầu/phản hồi có giới hạn. SSE cung cấp cập nhật nhanh và báo cần tải lại; không thay thế lưu trữ bền vững.

## Gửi thông báo nền

Sự kiện nghiệp vụ tạo bản ghi hàng đợi gửi (outbox) trong cùng giao dịch với trạng thái nguồn. Tiến trình gửi nhận tạm quyền xử lý bản ghi đến hạn, mã hóa nội dung tiếng Việt tối thiểu và gửi Web Push.

Mỗi lần gửi được ghi lại. Lỗi mạng, HTTP 429 hoặc 5xx được thử lại sau 5 giây, 20 giây, 1 phút, 5 phút và 15 phút trong thời hạn tồn tại của thông báo (TTL). HTTP 404/410 làm vô hiệu đăng ký. Dịch vụ gửi chấp nhận yêu cầu không chứng minh iPhone đã hiển thị.

## Đọc hạn mức Codex

Bộ kết nối Rust chạy tệp Codex tương thích đã lưu với đối số `app-server`, thực hiện `initialize`/`initialized`, kiểm tra `account/read` rồi gọi `account/rateLimits/read`. Phiên JSONL được giữ lâu dài để:

- nhận `account/rateLimits/updated`;
- đọc lại sau sự kiện Codex hoàn tất phù hợp;
- xử lý lần làm mới thủ công theo thứ tự;
- đọc định kỳ sau 15 giây khi có màn hình kết nối, sau 1 phút khi không có;
- khởi động lại tiến trình con khi thoát bất ngờ, với thời gian chờ tăng có giới hạn.

Nhịp định kỳ tính từ lúc lần đọc trước hoàn tất; hai lần đọc bình thường cách nhau ít nhất 5 giây. Thời gian chờ Codex là 30 giây, yêu cầu làm mới HTTP chờ tối đa 35 giây. Không đọc bù dồn sau ngủ máy hoặc phản hồi chậm.

Không cần tạo cuộc hội thoại hoặc lượt Codex để đọc hạn mức. Bộ chuẩn hóa nhận mọi khung `primary`/`secondary`, băm mã nhóm nội bộ, chặn phần trăm ngoài miền hợp lệ và đặt nhãn tiếng Việt theo thời lượng khi tên trả về không an toàn. Không đoán số yêu cầu còn lại.

SQLite giữ lần đọc thành công gần nhất khi bộ đọc lỗi. Chuyển sang mức thấp, rất thấp hoặc hết hạn mức được ghi tối đa một lần cho mỗi khung/chu kỳ đặt lại. Trạng thái cảnh báo, hoạt động và thông báo đủ điều kiện được ghi trong cùng giao dịch.

## Nhận tín hiệu và kết quả Codex

Trình cài đặt ghép lệnh `notify` cấp người dùng cùng các hook VibePing `UserPromptSubmit`, `PermissionRequest`, `PostToolUse` được chọn và `Stop`. Các hook khác và lệnh notify trước đó được giữ lại. Người dùng phải xem và tin cậy đúng mã băm hook qua `/hooks`; VibePing không bỏ qua bước này.

Tiến trình hook phân loại JSON có giới hạn kích thước trong bộ nhớ, loại lời nhắc, đầu vào/nhật ký công cụ và đường dẫn bản ghi hội thoại. Kênh loopback có token chỉ nhận khóa phiên/lượt đã băm, tên thư mục dự án đã lọc, loại tín hiệu, thời gian, tên công việc nếu có và câu trả lời cuối được phép giữ.

Câu trả lời lấy từ notify được hỗ trợ; phương án dự phòng `thread/read` phải khớp đúng lượt. Nội dung giới hạn 8.000 ký tự Unicode, lưu trên sự kiện kết thúc trong SQLite. Danh sách và SSE chỉ mang trích đoạn ngắn. Kết quả đến muộn bổ sung vào cùng sự kiện, không tạo thêm thông báo hoặc mục chưa đọc.

Chi tiết trả lại câu trả lời đã lưu; chi tiết đã xem có thể nằm trong bộ đệm mobile. Thông báo tiêu chuẩn có thể có trích đoạn đã lọc; chế độ dự án/riêng tư bỏ trích đoạn và được kiểm tra lại trước gửi. Giao dịch cập nhật lượt, tạo hoạt động chống trùng và một việc gửi đủ điều kiện cho mỗi đăng ký chủ sở hữu còn hiệu lực. SSE chỉ phát dữ liệu đã ghi thành công.

Nếu VibePing đang được phép chạy nhưng bất ngờ không sẵn sàng, bản ghi đã lọc vào hàng chờ tệp có giới hạn (spool), ghi nguyên tử và xử lý đúng một lần khi khởi động lại. Dừng chủ động tắt ý định chạy trước; hook gọi sau đó thoát thành công mà không tích hàng chờ.

## Đồng bộ hoạt động và bộ nhớ đệm

`GET /api/v1/bootstrap` trả công việc hiện tại, hạn mức chuẩn hóa và tổng chưa đọc. Danh sách phân trang dùng mã sự kiện làm con trỏ ổn định. Đọc chi tiết và đánh dấu đã đọc/tất cả đã đọc đều ràng buộc với chủ sở hữu; gọi lại không làm phát sinh tác dụng phụ trùng.

IndexedDB giữ tối đa 100 bản hoạt động an toàn theo chính sách riêng tư, tóm tắt khởi tạo, thông tin phân trang và thao tác đánh dấu đã đọc đang chờ. Khi mở từ bộ đệm, giao diện hiện ngay kèm nhãn dữ liệu cũ; REST thành công sẽ thay hoặc gộp dữ liệu. Thao tác đã đọc khi mất mạng được gửi lại sau kết nối. Các mã sự kiện trùng được gộp.

Phiên bản service worker mới chỉ kích hoạt sau thao tác hiển thị rõ của người dùng, tránh tải lại bất ngờ khi đang đọc.

## Cài đặt và chẩn đoán

Một bản cài đặt đã kiểm tra trong SQLite điều khiển loại thông báo, ngưỡng hạn mức thấp, cảnh báo nghiêm trọng, giờ yên tĩnh, ngoại lệ khẩn, chế độ riêng tư, giao diện và thời gian giữ lịch sử.

Tắt loại thông báo chỉ ngăn tạo việc gửi; hoạt động vẫn được lưu. Giờ yên tĩnh dời gửi đến cuối khoảng giờ địa phương; tín hiệu cần quay lại gấp có thể bỏ qua khi đã bật ngoại lệ. Giờ bắt đầu muộn hơn giờ kết thúc nghĩa là qua nửa đêm. Chế độ riêng tư dùng nội dung màn hình khóa chung.

Lưu thời gian giữ lịch sử đồng thời xóa dữ liệu chính đã hết hạn trong cùng giao dịch. Giao diện áp dụng ngay và được lưu cho lần mở tiếp theo. Đăng ký lại thông báo chỉ diễn ra theo thao tác rõ ràng: xóa bản đăng ký máy chủ khi có thể, hủy đăng ký trình duyệt rồi tạo bản thay thế.

Trang Máy tính tổng hợp sức khỏe tiến trình, tích hợp Codex, bộ đọc hạn mức, đăng ký điện thoại, danh tính truy cập riêng và tín hiệu gần nhất. Chẩn đoán chạy lại các kiểm tra cục bộ có giới hạn, trả hướng dẫn khôi phục dễ hiểu.

Báo cáo sao chép chỉ gồm phiên bản, mã trạng thái cố định, số lượng và thời gian. Không chứa đường dẫn, danh tính, địa chỉ nhận thông báo, thông tin đăng nhập, lời nhắc hoặc lỗi thô.

## Lưu trữ và ghép nối

SQLite trên Windows là dữ liệu chính. IndexedDB chỉ chứa bản hiển thị có thể thay thế và thông tin đồng bộ. Khóa riêng VAPID ở thư mục dữ liệu được Git bỏ qua; đăng ký nhận thông báo nằm trong SQLite.

Bộ nhập một lần sao lưu và chép đúng các tệp VAPID/đăng ký Gate 0 đã biết, giữ nguyên nguồn. Đăng ký nhập vào chỉ gắn với chủ sở hữu sau ghép nối.

Mã ghép nối có hạn ngắn, dùng một lần, chỉ lưu dạng băm. Header danh tính Tailscale chỉ được chấp nhận trên Host `.ts.net` ổn định. Thao tác ghi cần JSON cùng origin và token CSRF theo lần chạy. Header giả qua localhost bị từ chối. Trước lần nhận chủ sở hữu đầu tiên, chỉ cho phép khả năng đăng ký và gửi thử trong phạm vi thiết lập.

## Tổ chức thư mục

```text
apps/
  desktop/
    src/features/<tinh-nang>/
      *.rs              # mô-đun tách theo trách nhiệm của tính năng
  mobile/
    src/app/features/<tinh-nang>/
      application/      # trạng thái và điều phối
      data/             # API, bộ nhớ đệm
      ui/               # trang và component
contracts/
  openapi/              # hợp đồng OpenAPI xuất từ Rust
  generated/            # kiểu TypeScript sinh từ hợp đồng
  scripts/              # sinh và kiểm tra độ mới
```

Rust hiện dùng các mô-đun trong từng thư mục tính năng, không bắt buộc bốn thư mục con domain/application/infrastructure/http. Quy tắc nghiệp vụ, ca sử dụng, hạ tầng và HTTP vẫn phải tách trách nhiệm. Angular chỉ tạo thư mục lớp khi tính năng cần dùng. Phần nội bộ của tính năng là riêng. `main.rs` chỉ nối bộ kết nối và vòng đời; trang Angular chỉ điều phối trạng thái/tương tác. Không sửa tay hợp đồng sinh tự động.

## Cá nhân hóa và Sẵn sàng từ 1.1.1

Tính năng cá nhân hóa sở hữu hồ sơ và quy tắc thông báo dự án trong SQLite. Khóa hồ sơ là tên cuối thư mục đã được lọc bởi tính năng theo dõi; các thư mục có cùng tên cuối chủ ý dùng chung hồ sơ.

Công tắc chung luôn có quyền quyết định cuối. Trước khi nhận việc gửi, kiểm tra lại thời lượng hoàn tất, một lần nhắc chờ mỗi lượt/đăng ký, trạng thái đang chờ, giờ yên tĩnh và riêng tư. Lời nhắc dùng sự kiện gốc với khóa chống trùng riêng; không tạo hoạt động trùng. Lọc thông báo hoàn tất không xóa phiên hoặc câu trả lời.

Lịch sử dự án được lọc trong repository trước phân trang. Tổng kết ngày cắt khoảng quan sát theo ngày địa phương và gộp khoảng trùng nhau. Store Angular điều phối API/bộ đệm, bản nháp hồ sơ và độ mới dữ liệu; trang chỉ liên kết các phần này.

Trạng thái Sẵn sàng đọc lại khi quay về ứng dụng/trang và mỗi 30 giây khi hiển thị. Kết quả lỗi hoặc cũ phải ghi rõ là lần kiểm tra trước. Điện thoại không có lệnh điều khiển vòng đời Windows.

Tiến trình đồng hành được bật rõ ràng, có khóa chạy trùng và khay. Tệp khởi chạy không mở console dùng một mục HKCU Run do VibePing quản lý. Kiểm tra mỗi 10 giây qua kênh cục bộ đã xác thực; khôi phục có thời gian chờ tăng và tuần tự với Chạy/Dừng, không giết tiến trình theo PID. Dừng tắt ý định chạy trong phiên đăng nhập. Tắt Sẵn sàng xóa mục tự chạy và khay nhưng giữ nguyên trạng thái máy chủ. Xem [ADR 011](adr/011-personal-and-always-ready.md).

## Khả năng hoạt động và khôi phục

Tiến trình Windows giữ trạng thái và hàng đợi khi điện thoại/mạng gián đoạn. Lỗi Tailscale hoặc HTTPS dẫn tới hướng dẫn khôi phục kết nối riêng, không chuyển sang địa chỉ công khai.

Tiến trình nền không kế thừa handle console/pipe, nên `start` trả về trong khi máy chủ tiếp tục chạy và không giữ cửa sổ console. Lệnh trạng thái xác minh phản hồi sức khỏe thật, không chỉ tin tệp PID. Dừng ghi ý định tắt trước khi yêu cầu tắt an toàn có thời hạn. Khôi phục sau lỗi giữ ý định đang bật; thông tin cũ không chứng minh tiến trình còn sống.

SQLite dùng WAL, khóa ngoại, thời gian chờ khóa có giới hạn và `quick_check` quanh quá trình nâng cấp cấu trúc. Cơ sở dữ liệu cũ được checkpoint rồi sao lưu trước nâng cấp; lỗi sẽ khôi phục đúng dữ liệu trước đó.

Gói khôi phục thủ công có SQLite kèm mã kiểm tra và có thể chứa danh tính VAPID. Gói được kiểm tra kích thước/định dạng; chỉ khôi phục khi ứng dụng dừng và có xác nhận rõ. Thư mục dữ liệu Windows giới hạn quyền cho SID người dùng hiện tại và Local System. Bộ đệm IndexedDB hỏng bị loại và dựng lại từ API.
