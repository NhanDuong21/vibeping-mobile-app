const fallback = {
  title: 'Đã có lỗi khi kiểm tra.',
  action: 'VibePing sẽ tự thử lại.',
};

export type ClientErrorCopy = typeof fallback;

export function clientErrorCopy(code: string | undefined): ClientErrorCopy {
  void code;
  return fallback;
}
