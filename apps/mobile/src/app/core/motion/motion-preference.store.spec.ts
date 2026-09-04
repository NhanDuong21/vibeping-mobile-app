import { TestBed } from '@angular/core/testing';
import { MotionPreferenceStore } from './motion-preference.store';

describe('motion preferences', () => {
  beforeEach(() => localStorage.removeItem('vibeping.motion'));
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem('vibeping.motion');
  });

  it('retains the local choice while system reduction overrides it immediately', () => {
    const media = new EventTarget() as MediaQueryList;
    Object.defineProperty(media, 'matches', { value: false, writable: true });
    vi.stubGlobal('matchMedia', () => media);
    const motion = TestBed.inject(MotionPreferenceStore);
    expect(motion.level()).toBe('full');
    motion.set('balanced');
    expect(localStorage.getItem('vibeping.motion')).toBe('balanced');
    Object.defineProperty(media, 'matches', { value: true });
    media.dispatchEvent(new Event('change'));
    TestBed.tick();
    expect(motion.level()).toBe('balanced');
    expect(motion.enabled()).toBe(false);
    expect(document.documentElement.dataset['motion']).toBe('minimal');
    Object.defineProperty(media, 'matches', { value: false });
    media.dispatchEvent(new Event('change'));
    expect(motion.effective()).toBe('balanced');
  });

  it('restores a saved level and suppresses motion while the app is hidden', () => {
    localStorage.setItem('vibeping.motion', 'balanced');
    const motion = TestBed.inject(MotionPreferenceStore);
    expect(motion.level()).toBe('balanced');
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    TestBed.tick();
    expect(motion.enabled()).toBe(false);
    expect(document.documentElement.dataset['motionPaused']).toBe('true');
    visibility.mockRestore();
  });
});
