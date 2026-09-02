import { isCachedActivity } from './activity-cache';

describe('Activity cache validation', () => {
  it('rejects corrupt optional cache records without reading their fields', () => {
    expect(isCachedActivity({ savedAt: 'not-a-date', events: 'private' })).toBe(false);
    expect(
      isCachedActivity({
        savedAt: '2026-09-02T00:00:00Z',
        currentWork: null,
        usageLimits: { state: 'stale', windows: [], cursor: '1' },
        unreadCount: 0,
        events: [],
        nextCursor: null,
        pendingReadIds: [],
        pendingReadAll: false,
      }),
    ).toBe(true);
  });
});
