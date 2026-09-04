import type { ActivityEventDetailDto, ActivityEventDto } from '../../../core/api/api-client';
import { dateGroup } from '../../../core/formatting/time';
import { workName, workPreview } from './work-copy';

export interface ActivityGroup {
  label: string;
  events: ActivityEventDto[];
}

const GENERIC_SUMMARIES = new Set([
  'Công việc đã hoàn tất trên laptop.',
  'Công việc mới đang được xử lý.',
  'Mở laptop để xem và quyết định.',
  'Bạn có thể mở VibePing để kiểm tra.',
  'Codex đã dừng với một kiểm tra chưa đạt.',
  'Mở Codex trên laptop để xem kết quả',
  'Mở chi tiết để đọc câu trả lời của Codex',
  'Chờ tín hiệu mới',
  'Đang xử lý yêu cầu',
]);

export function activityLabel(event: ActivityEventDto): string {
  const labels: Record<string, string> = {
    'codex.turn.started': 'Codex bắt đầu làm việc',
    'codex.attention.permission_required': 'Codex đang chờ bạn',
    'codex.preview.ready': 'Bản xem trước đã sẵn sàng',
    'codex.test.failed': 'Kiểm thử mã nguồn chưa đạt',
    'codex.turn.completed': event.resultExcerpt ? 'Codex đã có kết quả' : 'Công việc đã hoàn tất',
    'codex.allowance.low': 'Hạn mức Codex sắp thấp',
    'codex.allowance.critical': 'Hạn mức Codex gần hết',
    'codex.allowance.exhausted': 'Hạn mức Codex đã hết',
  };
  return labels[event.eventType] ?? 'VibePing đã cập nhật';
}

export function activityTaskTitle(event: ActivityEventDto): string {
  const summary = cleanVisibleText(event.summary).slice(0, 180);
  if (
    summary &&
    !GENERIC_SUMMARIES.has(summary) &&
    !looksLikePath(summary) &&
    summary.toLocaleLowerCase('vi-VN') !== activityProject(event).toLocaleLowerCase('vi-VN')
  ) {
    return summary;
  }
  const fallbacks: Record<string, string> = {
    'codex.turn.started': 'Công việc mới trong Codex',
    'codex.attention.permission_required': 'Cần xác nhận để tiếp tục',
    'codex.preview.ready': 'Bản xem trước của công việc hiện tại',
    'codex.test.failed': 'Lần kiểm thử Codex ghi nhận chưa đạt',
    'codex.turn.completed': 'Công việc trong Codex',
  };
  return event.session
    ? 'Công việc VibePing'
    : (fallbacks[event.eventType] ?? 'Tín hiệu mới từ Codex');
}

export function activityProject(event: ActivityEventDto): string {
  const parts = event.projectName.replaceAll('\\', '/').split('/');
  const name = cleanVisibleText(parts.at(-1) ?? '');
  return name.slice(0, 80) || 'Codex';
}

export function activityPreview(event: ActivityEventDto): string {
  return event.resultExcerpt?.trim()
    ? workPreview(event.resultExcerpt)
    : workName(activityTaskTitle(event), event.occurredAt);
}

export function activityDescription(event: ActivityEventDto): string {
  if (event.resultExcerpt && event.eventType === 'codex.turn.completed') return '';
  const summary = cleanVisibleText(event.summary).slice(0, 240);
  const descriptions: Record<string, string> = {
    'codex.turn.started': 'VibePing đã bắt đầu theo dõi công việc này.',
    'codex.attention.permission_required':
      'Codex cần bạn xác nhận trên laptop để tiếp tục công việc.',
    'codex.preview.ready': 'Codex đã mở bản xem trước trên laptop. Quay lại laptop để kiểm tra.',
    'codex.test.failed':
      'Khi yêu cầu này kết thúc, lần kiểm thử mã nguồn gần nhất VibePing ghi nhận báo chưa đạt. Đây là kết quả tại thời điểm thông báo; mở Codex trên laptop để xem chi tiết và các lần kiểm thử sau đó.',
    'codex.turn.completed':
      'Codex đã kết thúc yêu cầu này nhưng VibePing chưa có nội dung kết quả. Mở Codex trên laptop để xem.',
  };
  const fallback = descriptions[event.eventType];
  if (fallback) return fallback;
  if (
    summary &&
    !GENERIC_SUMMARIES.has(summary) &&
    !looksLikePath(summary) &&
    summary.toLocaleLowerCase('vi-VN') !== activityTaskTitle(event).toLocaleLowerCase('vi-VN')
  ) {
    return summary;
  }
  return '';
}

export function groupActivityEvents(events: ActivityEventDto[], now = new Date()): ActivityGroup[] {
  const groups = new Map<string, ActivityEventDto[]>();
  for (const event of events) {
    const label = dateGroup(event.occurredAt, now);
    groups.set(label, [...(groups.get(label) ?? []), event]);
  }
  return [...groups].map(([label, groupedEvents]) => ({ label, events: groupedEvents }));
}

export function timelineLabel(stage: ActivityEventDetailDto['timeline'][number]): string {
  const labels: Record<string, string> = {
    'codex.turn.started': 'Công việc bắt đầu',
    'codex.turn.resumed': 'Codex tiếp tục xử lý',
    'codex.turn.stopped': 'Yêu cầu đã dừng',
    'codex.test.passed': 'Kiểm thử đã đạt',
    'codex.attention.permission_required': 'Codex chờ bạn',
    'codex.preview.ready': 'Bản xem trước sẵn sàng',
    'codex.test.failed': 'Kiểm thử mã nguồn chưa đạt',
    'codex.turn.completed': 'Công việc hoàn tất',
  };
  return labels[stage.eventType] ?? 'Trạng thái được cập nhật';
}

function looksLikePath(value: string): boolean {
  return (
    /^[a-zA-Z]:[\\/]/.test(value) ||
    value.startsWith('/') ||
    value.includes('\\Users\\') ||
    value.includes('/Users/')
  );
}

function cleanVisibleText(value: string): string {
  return [...value]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join('')
    .trim();
}
