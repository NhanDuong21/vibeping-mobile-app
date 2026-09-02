import type { BootstrapDto, CurrentWorkDto } from '../../../core/api/api-client';

export type ReadinessSourceState = 'loading' | 'ready' | 'cached' | 'partial' | 'unavailable';
export type ReadinessKind =
  | 'checking'
  | 'offline'
  | 'codexSetup'
  | 'codexReview'
  | 'ready'
  | 'working'
  | 'waiting';

export interface ReadinessView {
  kind: ReadinessKind;
  label: string;
  title: string;
  detail: string;
}

export function readinessView(
  state: ReadinessSourceState,
  streamConnected: boolean,
  connection: BootstrapDto['connection'] | undefined,
  current: CurrentWorkDto | null,
): ReadinessView {
  if (state === 'loading' || (state === 'ready' && !streamConnected)) {
    return READINESS.checking;
  }
  if (
    state === 'cached' ||
    state === 'unavailable' ||
    !streamConnected ||
    connection?.desktop !== 'running' ||
    connection.privateConnection !== 'local'
  ) {
    return READINESS.offline;
  }
  if (current?.state === 'waiting') return READINESS.waiting;
  if (current?.state === 'running') return READINESS.working;
  if (connection.codex === 'notInstalled') return READINESS.codexSetup;
  if (connection.codex !== 'ready') return READINESS.codexReview;
  return READINESS.ready;
}

const READINESS: Record<ReadinessKind, ReadinessView> = {
  checking: {
    kind: 'checking',
    label: 'Đang kiểm tra',
    title: 'Đang kiểm tra VibePing',
    detail: 'Đang xác nhận kết nối với laptop và Codex.',
  },
  offline: {
    kind: 'offline',
    label: 'Chưa kết nối',
    title: 'Chưa kết nối được với laptop',
    detail: 'Mở VibePing trên laptop và kiểm tra Tailscale, ứng dụng sẽ tự kết nối lại.',
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
    title: 'Bạn có thể rời laptop',
    detail: 'VibePing sẽ báo khi Codex hoàn tất hoặc thật sự cần bạn.',
  },
  working: {
    kind: 'working',
    label: 'Đang theo dõi',
    title: 'Codex đang làm việc',
    detail: 'VibePing đang theo dõi công việc trên laptop.',
  },
  waiting: {
    kind: 'waiting',
    label: 'Cần bạn',
    title: 'Codex đang chờ bạn',
    detail: 'Mở laptop để xem và quyết định bước tiếp theo.',
  },
};
