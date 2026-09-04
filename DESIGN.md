---
name: VibePing
description: Tín hiệu riêng tư, nhẹ nhàng từ Windows đến iPhone.
colors:
  vibe-canvas: "#f3f7f4"
  vibe-surface: "#ffffff"
  vibe-ink: "#10251c"
  vibe-muted: "#587065"
  vibe-rule: "#d7e2dc"
  vibe-night: "#07140f"
  vibe-surface-dark: "#10241b"
  vibe-paper: "#f3f8f5"
  vibe-sage: "#9fb9aa"
  vibe-rule-dark: "#274236"
  vibe-mint: "#45d395"
  vibe-mint-soft: "#d9f8e8"
  vibe-green: "#17643f"
  vibe-amber: "#c78a2e"
  vibe-coral: "#b84b47"
typography:
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    letterSpacing: "-0.035em"
  title:
    fontSize: "1.375rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  row-title:
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontSize: "0.875rem"
    lineHeight: "1.5rem"
  field:
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: "1.25rem"
  metadata:
    fontSize: "0.75rem"
    lineHeight: "1.25rem"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  gutter: "20px"
  xl: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.vibe-ink}"
    textColor: "{colors.vibe-paper}"
    typography: "{typography.label}"
    padding: "0 20px"
  button-primary-dark:
    backgroundColor: "{colors.vibe-mint}"
    textColor: "{colors.vibe-ink}"
  text-field:
    textColor: "{colors.vibe-ink}"
    typography: "{typography.field}"
    rounded: "{rounded.md}"
    padding: "0 12px"
  session-prominent:
    backgroundColor: "{colors.vibe-surface}"
    textColor: "{colors.vibe-ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  session-prominent-dark:
    backgroundColor: "{colors.vibe-surface-dark}"
    textColor: "{colors.vibe-paper}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Hệ thống thiết kế VibePing

Các tên trường và giá trị ở đầu tệp được giữ để công cụ đọc. Các tiêu đề cấp hai giữ từ khóa tiếng Anh tương ứng vì bộ đọc thiết kế dùng chúng để nhận diện cấu trúc.

## Overview — Tổng quan

**Creative North Star: “Quiet signal” — Tín hiệu nhẹ nhàng**

VibePing là công cụ dùng hằng ngày. Giao diện cần bình tĩnh, rõ và đáng tin khi nhìn nhanh trên điện thoại. Trạng thái và việc cần làm quan trọng hơn trang trí; không thiết kế như trang quảng cáo, bảng phân tích, ứng dụng chat hoặc bảng điều khiển kiểu viễn tưởng.

Cá nhân hóa kế thừa giao diện hiện có qua tên/biểu tượng dự án quen thuộc, cài đặt thông thường và tổng kết ngày nhỏ. Sẵn sàng chỉ hiển thị trạng thái Windows thực tế trên điện thoại. Tài liệu mô tả tính năng đã triển khai và kiểm thử, không khẳng định người dùng đã bật Sẵn sàng trên máy đang cài.

**Đặc điểm chính:**

- Nền pha màu nhẹ, ít đường phân cách, màu trạng thái tiết chế.
- Phông hệ thống cục bộ; phân cấp rõ trạng thái, công việc và thông tin phụ.
- Một định danh công việc lâu dài, các yêu cầu riêng, thời gian ghi nhận và kết quả cuối được giữ.
- Linh vật dùng nguyên hình, chuyển động theo trạng thái và có giới hạn.
- Tiếng Việt dễ hiểu, focus rõ, phân biệt đã lưu và chưa xác nhận.

Ảnh sáng/tối trong `.impeccable/review/personal`, gồm hồ sơ ở 320 px/1024 px và trạng thái Windows cũ, là bằng chứng cho bố cục được ghi nhận. Đánh giá cuối đã giải quyết hai điểm cần sửa. Khay Windows native chưa có ảnh kiểm chứng; tài liệu chỉ ghi cách hiển thị trạng thái trên mobile.

Ảnh bản 1.3 trong `.impeccable/review/work-details` ghi nhận trạng thái rảnh/danh sách gọn, yêu cầu mới/cũ và công việc một yêu cầu ở bề rộng điện thoại, cùng danh sách căn giữa ở 1024 px. Quy tắc dưới đây theo mã đã biên dịch; tên và nội dung trong dữ liệu giả không trở thành quy tắc sản phẩm.

## Colors — Màu sắc

Nền trung tính pha xanh giữ giao diện dịu; xanh bạc hà làm điểm nhấn, hổ phách và san hô dành cho ngoại lệ. Phần đầu tệp giữ các giá trị chính từ `apps/mobile/src/styles.css`.

### Màu chính

- **Xanh bạc hà** (`vibe-mint`): sẵn sàng, focus, công tắc bật, điều hướng được chọn và hành động chính ở giao diện tối.
- **Xanh đậm** (`vibe-green`): chữ nhấn dễ đọc trên nền sáng.
- **Bạc hà nhạt** (`vibe-mint-soft`): nền nhẹ cho trạng thái được chọn.

### Màu trạng thái

- **Hổ phách** (`vibe-amber`): đang chờ, đang kiểm tra hoặc chưa xác nhận.
- **San hô** (`vibe-coral`): lỗi hoặc mất kết nối tại thành phần phù hợp.

### Màu trung tính

- `vibe-canvas` / `vibe-night`: nền trang sáng pha màu / tối xanh đen.
- `vibe-surface` / `vibe-surface-dark`: nền trắng / xanh tối của vùng chứa cần thiết.
- `vibe-ink` / `vibe-paper`: chữ chính và chữ tương phản trên nút chính.
- `vibe-muted` / `vibe-sage`: thông tin phụ, thời gian, hướng dẫn.
- `vibe-rule` / `vibe-rule-dark`: đường phân cách nhẹ.

Mặc định lần đầu là giao diện sáng. Sáng, tối và theo hệ thống đều là lựa chọn chính thức, được lưu khi người dùng đổi. Đổi giao diện phải giữ ý nghĩa màu và độ tương phản.

**Quy tắc màu nhấn dự án:** chỉ dùng ở biểu tượng nhỏ cạnh tên dự án. Không đổi màu cả trang hoặc thay chữ trạng thái. Nhãn lựa chọn là “Xanh bạc hà”, “Xanh dương”, “Xanh lá”, “Hổ phách” và “San hô”; lựa chọn nội bộ `mint` vẫn mang nhãn “Xanh bạc hà”.

## Typography — Chữ và phân cấp

**Phông tiêu đề và nội dung:** dùng chung bộ phông hệ thống ở đầu tệp. Không tải phông hoặc biểu tượng từ CDN. Phân cấp bằng kích thước, độ đậm và khoảng trắng.

### Vai trò chữ

- **Headline:** tên trang/dự án đậm, gọn, xuống dòng khi dài.
- **Title:** tiêu đề khu vực và tên công việc nổi bật.
- **Row title:** tên dự án, công việc và hàng mở yêu cầu.
- **Body:** hướng dẫn, trạng thái, thời lượng; nội dung dài dùng giãn dòng dễ đọc.
- **Field:** giá trị ô nhập và danh sách chọn lớn hơn nhãn.
- **Label:** nhãn ngắn và hành động in đậm.
- **Metadata:** tên dự án gốc, thời gian và ghi chú ở mức phụ. Thời gian và số tổng kết dùng chữ số có độ rộng đều nhau.

Nội dung hiển thị bằng tiếng Việt, nói trạng thái hiện tại và cách khôi phục trước. Không đưa tên giao thức thô, dấu vết lỗi, mã HTTP, lỗi cơ sở dữ liệu hoặc mã định danh nội bộ lên thông báo chính. Báo cáo kỹ thuật đã lọc chỉ xuất hiện khi chủ động mở rộng.

## Layout — Bố cục

Dùng đơn vị khoảng cách cơ sở 4 px, thường là 8/12/16/24/32 px. Khoảng trên một mục mới lớn hơn khoảng giữa tiêu đề và nội dung của mục. Chữ phải đọc thoải mái khi cầm điện thoại.

Ưu tiên bố cục thoáng, đường phân cách rõ và ít vùng đóng khung. Trang Cá nhân hóa/Cài đặt có một cột căn giữa, rộng tối đa 32 rem, lề ngang 20 px. Mục cài đặt lớn bắt đầu sau khoảng cách 32 px và đường kẻ, có đệm trên 24 px. Hai ô biểu tượng/màu nhấn chia đều, cách 12 px; công tắc thông báo chiếm cả hàng. Bố cục vẫn căn giữa ở 1024 px.

Thiết kế từ mobile tại 320/375/390/430 px. Tôn trọng vùng an toàn iPhone, chữ động, thứ tự tiêu đề hợp lý và focus bàn phím; không tràn ngang, không dùng vùng thông báo trực tiếp quá nhiều, không chỉ dựa vào màu.

Tên gốc dự án dài được xuống dòng dưới tên có thể sửa. Nhãn, giá trị chọn native và mũi tên mở rộng phải vừa ở 320 px. Giữ ba tab **Hoạt động**, **Máy tính**, **Cài đặt**. Danh sách/hồ sơ dự án đi từ Cài đặt, có đường quay lại và không giữ thanh tab chính ở trang con. Trang tab chính chừa chỗ cho thanh cố định và vùng an toàn dưới.

## Elevation — Độ nổi và chiều sâu

Giao diện tĩnh chủ yếu phẳng: nền pha màu, đường kẻ và ít vùng tương phản tạo chiều sâu. Thẻ phiên nổi bật dùng viền, không dùng bóng đổ. Bóng nhỏ của nút gạt là dấu hiệu điều khiển, không phải mẫu bóng cho mọi thẻ.

Vòng nền quanh chấm diễn biến giúp đường nối dễ đọc. Focus dùng viền bạc hà 3 px, cách thành phần 3 px.

## Shapes — Hình dạng

Vùng chứa cần thiết bo góc 12–16 px; lựa chọn điều khiển nhỏ dùng 8 px. Ô nhập/chọn native bo 12 px, viền mảnh theo giao diện, đệm ngang 12 px, cao tối thiểu 48 px. Rãnh công tắc, dấu chọn điều hướng và chấm trạng thái được bo tròn.

Hành động chính có vùng chạm tối thiểu 44×44 px; nút lưu hồ sơ rộng cả cột và cao ít nhất 48 px. Biểu tượng dự án là SVG nét 16 px, có chữ đi kèm: Mèo, Nhịp tim, Lớp học, Mã nguồn, Tia sáng. Đầu trang và hướng dẫn cài đặt dùng biểu tượng VibePing chính thức cục bộ; không thay bằng chữ hoặc vẽ lại linh vật thành icon.

## Components — Thành phần giao diện

### Nút và ô nhập

Hành động ngắn, trực tiếp. Nút chính dùng nền mực đậm/chữ sáng ở giao diện sáng, nền bạc hà/chữ đậm ở giao diện tối. Hành động khôi phục phụ có chữ dễ đọc, gạch chân tại nơi đang dùng và focus toàn cục. Giữ phản hồi chạm, trạng thái vô hiệu rõ và chỉ xin quyền sau thao tác trực tiếp.

Nhãn đậm nằm trên ô nhập/chọn, cách 8 px. Công tắc thông báo ở cuối hàng có đường phân cách; hàng cao ít nhất 56 px, vùng chạm công tắc 44 px. Rãnh thấy được 48×28 px, nút trắng 20 px. Màu bật bạc hà phải đi cùng trạng thái checked cho công nghệ hỗ trợ.

### Hồ sơ và quy tắc thông báo dự án

Thứ tự: quay lại, tên hiển thị, tên gốc, chọn biểu tượng/màu, công tắc thông báo, chọn ngưỡng có giới hạn, nút lưu cả chiều rộng, lịch sử dự án. Tên hiển thị tối đa 60 ký tự; tên gốc là thông tin phụ.

**Chỉ dùng danh tính đã lưu:** tên, biểu tượng và màu dùng chung chỉ đổi sau khi lưu thành công. Giữ bản sửa lỗi để thử lại, báo “Đã lưu hồ sơ dự án.” khi thành công, gắn nhãn hồ sơ lấy từ bộ đệm. Trình sửa có thể hiện bản nháp; Hoạt động và nơi khác vẫn dùng hồ sơ đã xác nhận.

Công tắc chung quyết định cuối. Một loại thông báo phải bật cả ở mức chung lẫn dự án; giờ yên tĩnh vẫn áp dụng. Bốn loại theo dự án: hoàn tất, Codex đang chờ, kiểm thử cuối chưa đạt, bản xem trước sẵn sàng. Hạn mức vẫn điều khiển riêng ở mức chung.

Ngưỡng hoàn tất: mọi công việc, 2 phút hoặc 5 phút. Nhắc chờ: tắt, một lần sau 5 phút hoặc một lần sau 10 phút. Dự án có thêm “Theo cài đặt chung”. Dùng danh sách chọn thông thường. Giải thích rõ: thiếu giờ bắt đầu vẫn cho phép báo hoàn tất; công việc cần quay lại và kiểm thử cuối chưa đạt theo loại thông báo và giờ yên tĩnh đã chọn.

Lịch sử dùng hàng công việc gọn và mở thẳng chi tiết. Giữ trạng thái hiện tại và kết quả đầy đủ. Lịch sử đệm có nhãn, cách thử lại và hành động rõ khi tải trang trước hoặc gặp lỗi.

### Sẵn sàng trên Windows

Mục này trong Cài đặt có đường phân cách, chấm nhỏ, trạng thái tiếng Việt đậm, thông tin phụ và “Kiểm tra lại laptop”. Điện thoại báo về tiến trình đồng hành và giải thích thao tác chạy/khay nằm trên Windows; không có nút Khởi động/Dừng từ điện thoại.

**Gắn thời gian cho bằng chứng cũ:** kết quả kiểm tra thành công trước đây không được tiếp tục nói máy đang khỏe khi đã cũ. Khi đang kiểm tra, quá hạn hoặc không đọc được, hiện trạng thái tương ứng và “Lần kiểm tra trước” kèm ngày giờ nếu có. Chỉ hiện lựa chọn chạy khi đăng nhập cùng kết quả sẵn sàng còn mới.

Đánh dấu cần kiểm tra lại khi trang ẩn; đọc lại lúc ứng dụng/trang hiện, kết nối lại và mỗi 30 giây khi nhìn thấy. Nhịp xác nhận máy chủ đã bật cũ hơn 75 giây là dữ liệu cũ. Hướng dẫn trỏ đến **Bật Sẵn sàng** và khay trong gói Windows; Dừng chỉ chạy lại khi khởi động thủ công hoặc lần đăng nhập đã bật tiếp theo. Diện mạo khay native nằm ngoài bằng chứng giao diện này.

### Danh sách công việc và yêu cầu mở tại chỗ

**Một công việc xuyên suốt:** cuộc hội thoại Codex đã xác minh có một định danh cấp đầu, gọi **Công việc**. Quan hệ cha-con rõ ràng đưa tác nhân phụ và tác nhân lồng vào gốc; bản tách do người dùng tạo, cùng mã phiên hoặc cùng dự án không đủ để gộp. Không đoán quan hệ thiếu/sai.

Mỗi lượt được lưu vẫn là **Yêu cầu**, giữ mã nguồn và lượt đã băm ban đầu. Yêu cầu gốc mới nhất còn lưu quyết định trạng thái/kết quả chính, kể cả khi tác nhân phụ bắt đầu sau. Yêu cầu phụ góp vào số lượng nhưng không thay yêu cầu chính.

Thẻ nổi bật chọn công việc đang chạy mới cập nhật nhất hoặc công việc đang cần xử lý, không lặp lại trong danh sách. Khi rảnh, dùng khối nhỏ **Codex đang nghỉ**. Chỉ hiện nhóm **Đang làm việc**, **Cần chú ý**, **Gần đây** khi có dữ liệu. Lịch sử thiếu mã hội thoại vẫn đọc riêng trong **Hoạt động cũ**.

Thẻ đang làm giữ viền, góc/đệm 16 px, biểu tượng cục bộ và tên 22 px. Công việc gần đây là hàng thoáng có đường phân cách: tên đậm 16 px, dự án một dòng, số yêu cầu, trạng thái/thời gian, một câu trích đoạn dễ đọc và mũi tên. Tên tối đa hai dòng. Cả hàng là một liên kết có focus và vùng chạm ít nhất 44 px; không lặp lời kêu gọi bấm hoặc thông tin tín hiệu.

**Chỉ hiển thị thời gian có bằng chứng:** giữ đúng giai đoạn và mốc giờ đã ghi. Thẻ đang làm hiện thời lượng yêu cầu hiện tại và giai đoạn mới nhất. Ở trang chủ, dữ liệu đang chạy còn mới hiện giây/phút/giờ bằng tiếng Việt, ví dụ **1 giờ 12 phút 34 giây**, với chữ số đều nhau ở vị trí cũ.

Hai bộ đếm trang chủ dùng `role="timer"`, `aria-live="off"` để không yêu cầu đọc mỗi giây; vùng trạng thái xung quanh vẫn thông báo nhẹ. Đồng hồ cập nhật mỗi giây độc lập với lần đối soát mạng 15 giây; tạm dừng khi ẩn/mất mạng, lấy giờ thực khi quay lại. Thiếu giờ bắt đầu thì giải thích trong chi tiết. Dữ liệu cũ, chưa xác nhận hoặc mất kết nối chỉ tính đến tín hiệu cuối và dừng chuyển động; thời lượng đã hoàn tất giữ cố định. Chi tiết/lịch sử vẫn hiển thị đến phút. Không lấy khoảng từ giờ bắt đầu đến cập nhật để gọi là tổng thời gian công việc.

**Hai tầng đọc:** mở **Chi tiết công việc** sẽ thấy diễn biến và câu trả lời của yêu cầu gốc mới nhất còn lưu dưới **Yêu cầu gần nhất**. Nếu không còn yêu cầu gốc, dùng yêu cầu mới nhất có sẵn, không dựng câu trả lời gốc.

Các yêu cầu khác, kể cả tác nhân phụ/lồng, nằm ở **Yêu cầu trước đó**, mở độc lập tại chỗ, không sang tuyến mới. Công việc một yêu cầu bỏ nhãn phân cấp và bộ đếm. Trang cũ tải theo nhu cầu trong khi yêu cầu chính vẫn đầu tiên.

Địa chỉ công việc con cũ mở về gốc đã xác minh; liên kết sự kiện/thông báo mở đúng câu trả lời, kể cả ngoài trang đã tải. Đối soát bộ đệm cũ không đổi mã yêu cầu, nội dung hoặc diễn biến. Nhóm đã đối soát và kết quả đã xem vẫn dùng được khi mất mạng, có nhãn dữ liệu lưu và cách thử lại.

Kết quả đầy đủ giữ tiêu đề, danh sách, mã và nội dung gốc. Nếu bị giới hạn dung lượng, chỉ rõ cần mở Codex để đọc phần còn lại. Mốc diễn biến giữ giờ với chữ số đều, đường nối mảnh và màu trạng thái. Phần riêng tư mặc định thu gọn.

Kiểm thử đã được sửa không còn làm công việc cần chú ý; mốc lỗi cũ vẫn trong lịch sử. Trích đoạn ở hàng mới/cũ chọn câu dễ đọc, loại nội dung rà soát nội bộ, mã và đường dẫn. Không còn câu phù hợp thì dùng **Đã có kết quả từ Codex**. Yêu cầu thiếu trích đoạn có thể dùng giai đoạn cuối; sự kiện cũ dùng tóm tắt/tên an toàn.

Giữ tên đã lưu nếu an toàn; thiếu tên hoặc tên nội bộ dùng **Công việc VibePing · HH:mm**. Giữ linh vật, tab, giao diện và chuyển động hạn mức hiện có.

**Tín hiệu chi tiết còn mới:** chỉ hiện ba vạch trang trí 24 px cạnh trạng thái của phiên đang được chọn, đang chạy và có bằng chứng dưới 120 giây. Tối đa dùng vòng scaleY/opacity nhẹ 2,4 giây; Vừa phải, Tối giản và giảm chuyển động hệ thống giữ dấu tĩnh. Hủy vòng khi ẩn/ngoài màn hình. Bỏ dấu khi chờ, kết thúc, mất mạng hoặc dữ liệu cũ. Chữ trạng thái đứng yên; diễn biến và kết quả giữ thứ tự.

### Tổng kết Hôm nay

Bốn hàng dưới Hoạt động: **Yêu cầu đã theo dõi**, **Công việc hoàn tất**, **Lần kiểm thử chưa đạt**, **Thời gian ghi nhận**. Nhãn dịu, giá trị đậm căn phải với chữ số đều; cách hàng 12 px. Không thêm biểu đồ, điểm số hay lưới thẻ phân tích.

Thời gian tính từ bắt đầu đã ghi đến tín hiệu cuối; khoảng trùng chỉ tính một lần. Giữ giải thích dưới các hàng; tổng kết đệm có tiền tố **Tổng kết đã lưu.** Chưa có dữ liệu thì báo đang tải hoặc kết nối lại. Không ngụ ý đây là tổng thời gian làm việc ngoài bằng chứng quan sát.

### Linh vật nguyên hình và chuyển động

Đầu trang dùng nguyên PNG mèo chính thức: ảnh 40 px trong vùng 48 px. Chỉ biến đổi cả ảnh, thêm dấu SVG nhỏ, vòng tín hiệu hoặc tia hoàn tất ngắn. Đang làm/nghỉ có thể thở nhẹ; chờ thì nghiêng nhẹ thưa; hoàn tất phản hồi sự kiện; lỗi rung ngắn. Mất mạng, dừng và chưa xác nhận dùng ảnh xám dịu và vòng đứt. Dấu cà phê chỉ xuất hiện khi thời gian quan sát vượt 30 phút. Chữ bên cạnh luôn là nguồn giải thích trạng thái.

VibePing Alive biểu diễn tín hiệu riêng từ laptop đến iPhone, giữ bảng màu Quiet signal và bố cục thoáng. Chuyển động trạng thái, phản hồi sự kiện ngắn, chuyển trang liên tục, thay đổi hạn mức và phản hồi chạm phải giải thích trạng thái/thao tác thật. Có thể dùng lò xo, gợn cục bộ, nét SVG và hiệu ứng xuất hiện lệch thời gian có giới hạn.

Thứ tự tín hiệu mới: xác nhận trạng thái, thêm vào danh sách, phản hồi chưa đọc. Mã sự kiện ngăn phát lại sau REST/kết nối lại. Không bịa tiến độ hoặc làm dữ liệu cũ trông như đang chạy. Sơ đồ kết nối chỉ giải thích độ sẵn sàng, không chứng minh thông báo đã tới thiết bị.

**Tối đa** (`Full`) mặc định; **Vừa phải** (`Balanced`) giữ phản hồi ngắn; **Tối giản** (`Minimal`) giữ dấu tĩnh và chữ. Giảm chuyển động hệ thống ghi đè ngay lựa chọn cục bộ. Dừng vòng ngoài màn hình, trên trang Ionic ẩn và khi chạy nền. Tối đa hai vòng gây chú ý phối hợp trong một vùng nhìn. Dùng transform/opacity hoặc nét SVG có giới hạn; tránh làm mờ, vẽ bóng liên tục hoặc bộ đếm trang trí.

Thời gian: phản hồi chạm 140–180 ms; chuyển trang 240–340 ms; đổi trạng thái 350–460 ms; xác nhận sự kiện tối đa 760 ms; độ trễ lệch giữa các phần tối đa 240 ms. Nội dung luôn đọc/tương tác được; vùng chạm chính ít nhất 44×44 px.

Linh vật hủy Web Animations khi tắt chuyển động hoặc ra khỏi màn hình; không coi trạng thái ban đầu là sự kiện mới. Chỉ Tối đa có vòng chuyển động nền. Tia hoàn tất mờ đi trong 900 ms, không trì hoãn chữ hoặc tương tác.

### Hạn mức đã lưu và xem trước màn hình khóa

Khi mất kết nối, giữ hạn mức đã lưu, ghi rõ là lần đọc trước cùng ngày giờ địa phương gốc. Giữ phân cấp phần trăm và màu giao diện. Mốc đặt lại trong bộ đệm không tự làm mới con số. Chi tiết có một thông báo nhẹ; tóm tắt hoạt động có thời gian phụ.

Bản xem trước thông báo dùng cùng giao diện, biểu tượng cục bộ, tên ứng dụng/thời gian, tiêu đề sự kiện và một dòng nội dung ngắn. Ba chế độ cho thấy chỉ sự kiện, chỉ dự án hoặc công việc kèm dự án; ví dụ lấy từ sự kiện đủ điều kiện mới nhất hoặc ghi rõ minh họa.

Dùng chung bộ dựng nội dung phía máy chủ với lần gửi thật. Chỉ chuyển mờ khi mở thêm chi tiết; khi tăng riêng tư phải xóa chi tiết cũ ngay, không đợi hiệu ứng. Tắt chuyển động khi người dùng yêu cầu giảm.

## Do's and Don'ts — Nên làm và không làm

### Nên làm

- Đưa trạng thái, công việc và hành động lên trước trang trí; mọi màu trạng thái có chữ tiếng Việt đi cùng.
- Giữ định danh công việc/yêu cầu, mốc quan sát, quyền đọc kết quả và nhãn dữ liệu đệm.
- Dùng hồ sơ dự án đã xác nhận; giữ bản nháp lỗi để thử lại.
- Làm rõ công tắc chung và giờ yên tĩnh quyết định bộ lọc dự án.
- Đọc lại Sẵn sàng khi quay lại; ghi ngày giờ bằng chứng cũ nếu chưa biết trạng thái hiện tại.
- Dừng vòng linh vật khi ngoài màn hình, trang ẩn hoặc giảm chuyển động; giữ nguyên PNG.

### Không làm

- Không thêm thẻ lồng nhau, vùng mở đầu quá lớn, màu chuyển trang trí, kính mờ, biểu đồ giả hoặc huy hiệu trang trí.
- Không biến màu dự án thành giao diện cả trang hoặc màu trạng thái vận hành.
- Không trình bày số đệm, kiểm tra máy cũ hoặc thời gian chưa quan sát như dữ liệu trực tiếp.
- Không thêm điều khiển tiến trình từ điện thoại, chat hoặc tab Cá nhân hóa mới.
- Không thay biểu tượng bằng chữ hoặc đưa lỗi kỹ thuật thô lên giao diện.

**Viết kiểu dáng:** chỉ dùng lớp tiện ích Tailwind cho màn hình/component. Một tệp toàn cục tối thiểu có thể chứa import Tailwind, giá trị thiết kế và yêu cầu nền tảng không tránh được. Không thêm SCSS, Sass, CSS component, tệp selector lớn, Tailwind CDN hoặc phụ thuộc giao diện mặc định Ionic.

**Quy trình:** mọi phần người dùng thấy đều dùng skill Impeccable trong dự án. Ghi đúng sản phẩm, xác định phần việc, kế thừa/chọn định hướng rồi áp dụng chuẩn chất lượng. Gate 0 dùng shape, critique, harden và adapt, một vòng ảnh/sửa có giới hạn rồi một vòng xác nhận. Giới hạn sản phẩm luôn được ưu tiên.

**Không coi là quy tắc:** diện mạo khay native chưa chụp, tên/số liệu giả, kết quả nội bộ trong ảnh và tiêu đề Hoạt động trống kế thừa. Không biến lỗi giao diện thành giá trị thiết kế dùng lại. Bản tinh chỉnh 1.3 không thêm bảng màu, thang chữ, ảnh raster hoặc định hướng hình ảnh mới.
