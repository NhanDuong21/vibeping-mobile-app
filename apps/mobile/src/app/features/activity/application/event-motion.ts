import type { ActivityEventDto } from '../../../core/api/api-client';
import type { MotionCue } from '../../../core/motion/motion-presets';

export function eventMotionCue(event: ActivityEventDto | undefined): MotionCue {
  if (event?.eventType === 'codex.turn.completed') return 'success';
  if (event?.eventType === 'codex.test.failed') return 'failure';
  return 'arrive';
}

export function isLiveMotionEvent(event: ActivityEventDto, visible: boolean, now: number): boolean {
  const age = now - Date.parse(event.occurredAt);
  return visible && Number.isFinite(age) && age >= -5000 && age <= 60_000;
}
