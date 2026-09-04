import { TestBed } from '@angular/core/testing';
import { PersonalStore } from './personal.store';
import { ProjectEditorStore } from './project-editor.store';
import { PersonalApi, type ProjectProfile } from '../data/personal-api';
import { PersonalCache, validProfile, validRules, validSummary } from '../data/personal-cache';

const profile: ProjectProfile = {
  projectName: 'vibeping',
  displayName: 'VibePing',
  icon: 'cat',
  accent: 'mint',
  notifyCompletion: true,
  notifyPermission: true,
  notifyPreview: true,
  notifyFinalFailure: true,
  completionMinMinutes: null,
  waitingReminderMinutes: null,
};
function setup() {
  const api = {
    projects: vi.fn().mockResolvedValue([profile]),
    rules: vi.fn().mockResolvedValue({ completionMinMinutes: 2, waitingReminderMinutes: 5 }),
    saveProject: vi.fn().mockImplementation(async (v) => v),
    saveRules: vi.fn().mockImplementation(async (v) => v),
  };
  const cache = {
    read: vi.fn().mockResolvedValue(null),
    write: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      ProjectEditorStore,
      { provide: PersonalApi, useValue: api },
      { provide: PersonalCache, useValue: cache },
    ],
  });
  return {
    api,
    cache,
    store: TestBed.inject(PersonalStore),
    editor: TestBed.inject(ProjectEditorStore),
  };
}
describe('Personal settings', () => {
  it('validates cached contracts and refuses broken values', () => {
    expect(validProfile(profile)).toBe(true);
    expect(validProfile({ ...profile, icon: '<svg>' })).toBe(false);
    expect(validProfile({ ...profile, notifyPermission: 1 })).toBe(false);
    expect(validRules({ completionMinMinutes: 3, waitingReminderMinutes: 5 })).toBe(false);
    expect(validSummary({ sessions: 1, completed: 1, failedTests: 0, observedSeconds: NaN })).toBe(
      false,
    );
  });
  it('deduplicates project loads and preserves cached identity while offline', async () => {
    const { api, cache, store } = setup();
    cache.read.mockResolvedValue([profile]);
    api.projects.mockRejectedValue(new Error('offline'));
    await Promise.all([store.loadProjects(), store.loadProjects()]);
    expect(api.projects).toHaveBeenCalledTimes(1);
    expect(store.projectState()).toBe('cached');
    expect(store.profile('vibeping')?.displayName).toBe('VibePing');
  });
  it('does not replace a saved rule with an older load response', async () => {
    const { api, store } = setup();
    let resolve!: (v: { completionMinMinutes: number; waitingReminderMinutes: number }) => void;
    api.rules.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const pending = store.loadRules();
    await Promise.resolve();
    await Promise.resolve();
    await store.saveRules({ completionMinMinutes: 5, waitingReminderMinutes: 0 });
    resolve({ completionMinMinutes: 2, waitingReminderMinutes: 5 });
    await pending;
    expect(store.rules()?.completionMinMinutes).toBe(5);
    expect(store.ruleSave()).toBe('saved');
  });
  it('keeps failed profile edits available for retry and only applies confirmed saves', async () => {
    const { api, store, editor } = setup();
    await editor.open('vibeping');
    editor.text('displayName', 'Mèo canh việc');
    api.saveProject.mockRejectedValueOnce(new Error('offline'));
    await editor.save();
    expect(editor.saveState()).toBe('failed');
    expect(editor.draft()?.displayName).toBe('Mèo canh việc');
    expect(store.profile('vibeping')?.displayName).toBe('VibePing');
    await editor.save();
    expect(store.profile('vibeping')?.displayName).toBe('Mèo canh việc');
  });
  it('cancels a stale profile navigation and rejects blank names before sending', async () => {
    const { api, editor } = setup();
    await Promise.all([editor.open('vibeping'), editor.open('missing')]);
    expect(editor.state()).toBe('missing');
    await editor.open('vibeping');
    editor.text('displayName', '   ');
    await editor.save();
    expect(api.saveProject).not.toHaveBeenCalled();
  });
});
