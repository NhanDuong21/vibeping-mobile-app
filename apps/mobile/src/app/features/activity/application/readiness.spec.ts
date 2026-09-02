import { readinessView } from './readiness';

const connection = {
  desktop: 'running',
  codex: 'ready',
  privateConnection: 'local',
};

describe('activity readiness', () => {
  it('shows leave-laptop copy only when every live path is ready', () => {
    expect(readinessView('ready', true, connection, null).kind).toBe('ready');
    expect(readinessView('ready', false, connection, null).kind).toBe('checking');
    expect(readinessView('cached', false, connection, null).kind).toBe('offline');
  });

  it('separates missing integration from pending hook review', () => {
    expect(readinessView('ready', true, { ...connection, codex: 'notInstalled' }, null).kind).toBe(
      'codexSetup',
    );
    expect(readinessView('ready', true, { ...connection, codex: 'needsReview' }, null).kind).toBe(
      'codexReview',
    );
  });
});
