import type { ActivityEventDto, BootstrapDto, CurrentWorkDto } from '../../../core/api/api-client';

export type ReadinessSourceState = 'loading' | 'ready' | 'cached' | 'partial' | 'unavailable';
export type ReadinessKind =
  | 'stopped'
  | 'offline'
  | 'waiting'
  | 'failed'
  | 'preview'
  | 'working'
  | 'unconfirmed'
  | 'checking'
  | 'completed'
  | 'codexSetup'
  | 'codexReview'
  | 'ready';

export interface ReadinessView {
  kind: ReadinessKind;
  label: string;
  title: string;
  detail: string;
}

const RECENT_COMPLETION_MS = 10 * 60 * 1000;

export function readinessView(
  state: ReadinessSourceState,
  streamConnected: boolean,
  connection: BootstrapDto['connection'] | undefined,
  current: CurrentWorkDto | null,
  latest: ActivityEventDto | null,
  now = new Date(),
): ReadinessView {
  if (connection?.desktop === 'stopped') return READINESS.stopped;
  if (
    state === 'cached' ||
    state === 'unavailable' ||
    (connection && (connection.desktop !== 'running' || connection.privateConnection !== 'local'))
  ) {
    return READINESS.offline;
  }
  if (
    current &&
    (current.state === 'unconfirmed' ||
      !Number.isFinite(Date.parse(current.freshUntil)) ||
      now.getTime() >= Date.parse(current.freshUntil))
  )
    return READINESS.unconfirmed;
  if (current?.state === 'waiting') return READINESS.waiting;
  if (current?.lastTestState === 'failed') return READINESS.failed;
  if (current?.previewReady) return READINESS.preview;
  if (current?.state === 'running') return READINESS.working;
  if (state === 'loading' || state === 'partial') return READINESS.checking;
  if (!streamConnected)
    return {
      ...READINESS.checking,
      title: 'Đang nối lại cập nhật trực tiếp',
      detail: 'Laptop vẫn phản hồi. VibePing tự lấy trạng thái mới mỗi 15 giây khi bạn mở app.',
    };
  if (isRecentCompletion(latest, now)) return READINESS.completed;
  if (connection?.codex === 'notInstalled') return READINESS.codexSetup;
  if (connection?.codex !== 'ready') return READINESS.codexReview;
  return READINESS.ready;
}

function isRecentCompletion(event: ActivityEventDto | null, now: Date): boolean {
  return Boolean(
    event?.eventType === 'codex.turn.completed' &&
    now.getTime() - new Date(event.occurredAt).getTime() <= RECENT_COMPLETION_MS,
  );
}

const READINESS: Record<ReadinessKind, ReadinessView> = {
  stopped: {
    kind: 'stopped',
    label: 'Đang tắt',
    title: 'VibePing trên laptop đang tắt',
    detail: 'Mở “Start VibePing.bat” trước khi giao việc cho Codex.',
  },
  offline: {
    kind: 'offline',
    label: 'Chưa kết nối',
    title: 'Chưa kết nối được với laptop',
    detail: 'Bạn vẫn có thể xem lịch sử đã lưu. VibePing sẽ tự thử lại.',
  },
  waiting: {
    kind: 'waiting',
    label: 'Cần bạn',
    title: 'Codex đang chờ bạn',
    detail: 'Codex cần bạn xác nhận. Mở Codex trên laptop để quyết định bước tiếp theo.',
  },
  failed: {
    kind: 'failed',
    label: 'Cần kiểm tra',
    title: 'Kiểm thử mã nguồn chưa đạt',
    detail:
      'Lệnh kiểm thử mã nguồn do Codex chạy trên laptop báo chưa đạt. Codex có thể vẫn đang sửa; mở Codex để xem kết quả.',
  },
  preview: {
    kind: 'preview',
    label: 'Có bản xem trước',
    title: 'Bản xem trước đã sẵn sàng',
    detail: 'Codex vẫn đang làm việc. Bạn có thể kiểm tra bản xem trước trên laptop.',
  },
  working: {
    kind: 'working',
    label: 'Đang làm việc',
    title: 'Codex đang làm việc',
    detail: 'VibePing đang theo dõi tín hiệu thật từ laptop.',
  },
  unconfirmed: {
    kind: 'unconfirmed',
    label: 'Chờ tín hiệu mới',
    title: 'Chưa nhận tín hiệu mới từ Codex',
    detail:
      'Laptop vẫn kết nối, nhưng Codex chưa gửi tín hiệu mới trong 2 phút. Trạng thái sẽ tự cập nhật khi có tín hiệu; chưa thể kết luận công việc đã xong.',
  },
  checking: {
    kind: 'checking',
    label: 'Đang kiểm tra',
    title: 'Đang kiểm tra VibePing',
    detail: 'Đang xác nhận kết nối với laptop và Codex.',
  },
  completed: {
    kind: 'completed',
    label: 'Vừa hoàn tất',
    title: 'Công việc vừa hoàn tất',
    detail: 'Codex đã kết thúc lượt trả lời. Mở Codex trên laptop để xem kết quả.',
  },
  codexSetup: {
    kind: 'codexSetup',
    label: 'Cần cài kết nối',
    title: 'Chưa theo dõi được Codex',
    detail: 'Cài kết nối VibePing trên laptop để bắt đầu nhận tín hiệu.',
  },
  codexReview: {
    kind: 'codexReview',
    label: 'Cần hoàn tất 1 bước',
    title: 'Chưa nhận đủ tín hiệu từ Codex',
    detail: 'Duyệt kết nối VibePing một lần trên laptop để bắt đầu theo dõi.',
  },
  ready: {
    kind: 'ready',
    label: 'Sẵn sàng',
    title: 'VibePing đang lắng nghe',
    detail: 'Bạn có thể rời laptop. VibePing sẽ báo khi Codex cần bạn.',
  },
};
