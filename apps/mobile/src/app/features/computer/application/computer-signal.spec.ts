import { computerSignal } from './computer-signal';

const status = {
  desktop: 'running',
  codex: 'connected',
  allowanceReader: 'available',
  privateConnection: 'ready',
  notifications: 'ready',
  lastSignalAt: null,
  startedAt: '2026-09-04T00:00:00Z',
};

describe('computer signal path', () => {
  it('reaches iPhone only when all required stages are ready', () => {
    expect(computerSignal(status)).toMatchObject({ reached: 4, complete: true });
    expect(computerSignal({ ...status, privateConnection: 'unavailable' })).toMatchObject({
      reached: 2,
      complete: false,
      message: 'Cần kiểm tra tại Riêng tư.',
    });
    expect(computerSignal({ ...status, notifications: 'needsAttention' })).toMatchObject({
      reached: 3,
      complete: false,
    });
    expect(computerSignal({ ...status, desktop: 'stopped' }).reached).toBe(0);
  });
});
