import { TestBed } from '@angular/core/testing';
import { ThemeStore } from './theme.store';

describe('ThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
    document.querySelector('meta[name="theme-color"]')?.remove();
    const themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = '#f3f7f4';
    document.head.append(themeColor);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('starts in light mode even when the device prefers dark', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
    }));
    const store = TestBed.inject(ThemeStore);

    store.start();

    expect(store.preference()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('moves the previous system default to light once', () => {
    localStorage.setItem('vibeping.theme', 'system');
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
    }));
    const store = TestBed.inject(ThemeStore);

    store.start();

    expect(store.preference()).toBe('light');
    expect(localStorage.getItem('vibeping.theme')).toBe('light');
  });

  it('continues following the device when the user chooses system mode', () => {
    localStorage.setItem('vibeping.theme.light-default-migrated', '1');
    localStorage.setItem('vibeping.theme', 'system');
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
    }));
    const store = TestBed.inject(ThemeStore);

    store.start();

    expect(store.preference()).toBe('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('applies an explicit theme and keeps the choice locally', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
    }));
    const store = TestBed.inject(ThemeStore);
    store.start();
    store.set('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#07140f',
    );
    expect(localStorage.getItem('vibeping.theme')).toBe('dark');
    store.set('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#f3f7f4',
    );
  });
});
