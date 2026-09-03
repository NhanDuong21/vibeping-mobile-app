import type { ActivityEventDetailDto, ActivityEventDto } from '../../../core/api/api-client';
import { dateGroup } from '../../../core/formatting/time';

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
]);

export function activityLabel(event: ActivityEventDto): string {
  const labels: Record<string, string> = {
    'codex.turn.started': 'Codex bắt đầu làm việc',
    'codex.attention.permission_required': 'Codex đang chờ bạn',
    'codex.preview.ready': 'Bản xem trước đã sẵn sàng',
    'codex.test.failed': 'Kiểm thử vẫn chưa qua',
    'codex.turn.completed': 'Công việc đã hoàn tất',
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
    'codex.test.failed': 'Lần kiểm thử cuối vẫn còn lỗi',
    'codex.turn.completed': 'Công việc trong Codex',
  };
  return fallbacks[event.eventType] ?? 'Tín hiệu mới từ Codex';
}

export function activityProject(event: ActivityEventDto): string {
  const parts = event.projectName.replaceAll('\\', '/').split('/');
  const name = cleanVisibleText(parts.at(-1) ?? '');
  return name.slice(0, 80) || 'Codex';
}

export function activityDescription(event: ActivityEventDto): string {
  const summary = cleanVisibleText(event.summary).slice(0, 240);
  const descriptions: Record<string, string> = {
    'codex.turn.started': 'VibePing đã bắt đầu theo dõi công việc này.',
    'codex.attention.permission_required': 'Codex cần bạn quay lại để quyết định bước tiếp theo.',
    'codex.preview.ready': 'Codex đã tạo một bản xem trước để bạn kiểm tra.',
    'codex.test.failed': 'Codex đã dừng khi lần kiểm thử cuối vẫn còn lỗi.',
    'codex.turn.completed': 'Codex đã hoàn tất thay đổi trên laptop.',
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
    'codex.attention.permission_required': 'Codex chờ bạn',
    'codex.preview.ready': 'Bản xem trước sẵn sàng',
    'codex.test.failed': 'Kiểm thử vẫn chưa qua',
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
