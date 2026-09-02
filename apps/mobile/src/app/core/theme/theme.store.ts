import { Injectable, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'vibeping.theme';
const LIGHT_DEFAULT_MIGRATION_KEY = 'vibeping.theme.light-default-migrated';
const THEME_COLORS = { light: '#f3f7f4', dark: '#07140f' } as const;

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  readonly #preference = signal<ThemePreference>('light');
  #media?: MediaQueryList;
  #started = false;

  readonly preference = this.#preference.asReadonly();

  start(): void {
    if (this.#started) return;
    this.#started = true;
    const saved = this.#migratePreviousDefault(localStorage.getItem(STORAGE_KEY));
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      this.#preference.set(saved);
    }
    this.#media = window.matchMedia?.('(prefers-color-scheme: dark)');
    this.#media?.addEventListener('change', this.#systemChanged);
    this.#apply();
  }

  set(preference: string): void {
    if (preference !== 'system' && preference !== 'light' && preference !== 'dark') return;
    this.#preference.set(preference);
    localStorage.setItem(STORAGE_KEY, preference);
    this.#apply();
  }

  readonly #systemChanged = (): void => {
    if (this.#preference() === 'system') this.#apply();
  };

  #apply(): void {
    const dark =
      this.#preference() === 'dark' ||
      (this.#preference() === 'system' && this.#media?.matches === true);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);
  }

  #migratePreviousDefault(saved: string | null): string | null {
    if (localStorage.getItem(LIGHT_DEFAULT_MIGRATION_KEY) === '1') return saved;
    localStorage.setItem(LIGHT_DEFAULT_MIGRATION_KEY, '1');
    if (saved !== 'system') return saved;
    localStorage.setItem(STORAGE_KEY, 'light');
    return 'light';
  }
}
