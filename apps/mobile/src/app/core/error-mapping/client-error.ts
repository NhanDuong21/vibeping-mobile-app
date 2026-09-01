const fallback = {
  title: 'Đã có lỗi khi kiểm tra.',
  action: 'VibePing sẽ tự thử lại.',
};

export type ClientErrorCopy = typeof fallback;

export function clientErrorCopy(code: string | undefined): ClientErrorCopy {
  const known: Record<string, ClientErrorCopy> = {
    PAIRING_CODE_INVALID: {
      title: 'Mã kết nối chưa đúng.',
      action: 'Kiểm tra mã trên laptop rồi thử lại.',
    },
    PAIRING_CODE_EXPIRED: {
      title: 'Mã kết nối đã hết hạn.',
      action: 'Mở lại VibePing trên laptop để lấy mã mới.',
    },
    PAIRING_CODE_REUSED: {
      title: 'Mã kết nối này đã được dùng.',
      action: 'Mở lại VibePing trên laptop nếu bạn cần mã mới.',
    },
    PAIRING_RATE_LIMITED: {
      title: 'Bạn đã thử quá nhiều lần.',
      action: 'Chờ một phút rồi nhập lại mã.',
    },
    PHONE_NOT_READY: {
      title: 'Điện thoại chưa sẵn sàng nhận tín hiệu.',
      action: 'Bật lại thông báo rồi thử lần nữa.',
    },
    TEST_PUSH_RATE_LIMITED: {
      title: 'Đã gửi đủ tín hiệu thử lúc này.',
      action: 'Chờ một phút rồi thử lại.',
    },
  };
  return (code && known[code]) || fallback;
}
