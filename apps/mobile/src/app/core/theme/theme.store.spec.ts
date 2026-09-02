import { TestBed } from '@angular/core/testing';
import { ThemeStore } from './theme.store';

describe('ThemeStore', () => {
  it('applies an explicit theme and keeps the choice locally', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
    }));
    const store = TestBed.inject(ThemeStore);
    store.start();
    store.set('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('vibeping.theme')).toBe('dark');
    store.set('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
