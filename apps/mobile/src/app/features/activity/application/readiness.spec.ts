import type { ActivityEventDto, CurrentWorkDto } from '../../../core/api/api-client';
import { readinessView } from './readiness';

const connection = { desktop: 'running', codex: 'ready', privateConnection: 'local' };
const work: CurrentWorkDto = {
  projectName: 'vibeping-mobile-app',
  state: 'running',
  lastTestState: 'unknown',
  previewReady: false,
  startedAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:01:00Z',
  freshUntil: '2026-09-04T00:03:00Z',
};
const completion: ActivityEventDto = {
  id: 'event',
  eventType: 'codex.turn.completed',
  title: 'Codex đã hoàn tất',
  summary: 'Công việc đã hoàn tất trên laptop.',
  projectName: 'vibeping-mobile-app',
  occurredAt: '2026-09-04T00:05:00Z',
  isRead: false,
};

describe('activity readiness', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-04T00:02:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('never labels expired or unidentified cached work as working or completed', () => {
    for (const current of [
      work,
      { ...work, state: 'waiting' },
      { ...work, previewReady: true },
      { ...work, lastTestState: 'failed' },
      { ...work, freshUntil: '' },
    ]) {
      expect(
        readinessView(
          'ready',
          true,
          connection,
          current,
          completion,
          new Date('2026-09-04T00:03:00Z'),
        ).kind,
      ).toBe('unconfirmed');
    }
    expect(
      readinessView('ready', true, connection, { ...work, state: 'unconfirmed' }, null).kind,
    ).toBe('unconfirmed');
  });
  it('covers every live state without showing leave-laptop copy early', () => {
    expect(readinessView('ready', true, connection, null, null).kind).toBe('ready');
    expect(readinessView('ready', false, connection, null, null).kind).toBe('checking');
    expect(readinessView('cached', false, connection, null, null).kind).toBe('offline');
    expect(
      readinessView('ready', true, { ...connection, desktop: 'stopped' }, null, null).kind,
    ).toBe('stopped');
  });

  it('applies waiting, failing, preview and active precedence deterministically', () => {
    expect(
      readinessView('ready', false, connection, { ...work, state: 'waiting' }, null).kind,
    ).toBe('waiting');
    expect(
      readinessView('ready', false, connection, { ...work, lastTestState: 'failed' }, null).kind,
    ).toBe('failed');
    expect(
      readinessView('ready', false, connection, { ...work, previewReady: true }, null).kind,
    ).toBe('preview');
    expect(readinessView('ready', false, connection, work, null).kind).toBe('working');
  });

  it('shows a recent completion only after live work and checking states clear', () => {
    const now = new Date('2026-09-04T00:06:00Z');
    expect(readinessView('ready', true, connection, null, completion, now).kind).toBe('completed');
    expect(readinessView('ready', false, connection, null, completion, now).kind).toBe('checking');
  });

  it('separates missing integration from pending hook review', () => {
    expect(
      readinessView('ready', true, { ...connection, codex: 'notInstalled' }, null, null).kind,
    ).toBe('codexSetup');
    expect(
      readinessView('ready', true, { ...connection, codex: 'needsReview' }, null, null).kind,
    ).toBe('codexReview');
  });
});
