import { clock } from '../../../core/formatting/time';

const internal =
  /\b(?:disposition|verdict|quality.bar|material_fixes|recapture|impeccable|schema|DTO|sqlx|turn_count|thread identity|validated JSON|narrative mapping|color metadata|diff whitespace)\b|(?:chi tiết|hoạt động).*→|(?:^|\s)(?:[A-Z]:\\|\.?\.?\/|\S+\.(?:rs|ts|tsx|json|toml)\b)|^(?:palette|preserved the|no separate|persistence|fidelity|ceiling|keep|status|result|ship|pass|fail)\b/i;

export function workName(name: string | null | undefined, at: string): string {
  const text = name?.trim();
  return text &&
    !internal.test(text) &&
    !/^[{[`]|^(?:phiên|lượt) làm việc(?: VibePing| \d+)?$/i.test(text)
    ? text
    : `Công việc VibePing · ${clock(at)}`;
}

/** Select an actual useful sentence; never synthesize a result from internal review output. */
export function workPreview(excerpt: string): string {
  let code = false;
  for (const raw of excerpt.split('\n')) {
    if (/^\s*```/.test(raw)) {
      code = !code;
      continue;
    }
    if (code || /^\s*(?:#{1,6}\s|[{[}])/.test(raw)) continue;
    for (const sentence of raw.split(/(?<=[.!?])\s/)) {
      const text = sentence
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/^[-*+>\s]+/, '')
        .trim();
      if (text.length < 12 || text.split(/\s+/).length < 3 || internal.test(text)) continue;
      if (
        /\b(?:commit|push|pull request|CI|E2E|checksum|SHA-256)\b|^[\w.-]+:\s*\S+$|^Mở (?:Codex|chi tiết)/i.test(
          text,
        )
      )
        continue;
      return text.length <= 180 ? text : `${text.slice(0, 177).trimEnd()}…`;
    }
  }
  return 'Đã có kết quả từ Codex';
}
