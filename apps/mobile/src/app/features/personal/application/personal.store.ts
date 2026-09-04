import { inject, Injectable, signal } from '@angular/core';
import { PersonalApi, type PersonalRules, type ProjectProfile } from '../data/personal-api';
import { PersonalCache, validProfile, validRules } from '../data/personal-cache';

@Injectable({ providedIn: 'root' })
export class PersonalStore {
  readonly #api = inject(PersonalApi);
  readonly #cache = inject(PersonalCache);
  readonly profiles = signal<ProjectProfile[]>([]);
  readonly rules = signal<PersonalRules | null>(null);
  readonly projectState = signal<'loading' | 'ready' | 'cached' | 'unavailable'>('loading');
  readonly ruleState = signal<'loading' | 'ready' | 'cached' | 'unavailable'>('loading');
  readonly ruleSave = signal<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  #projectsLoad?: Promise<void>;
  #rulesLoad?: Promise<void>;
  #ruleRevision = 0;
  #projectRevision = 0;

  profile(name: string): ProjectProfile | undefined {
    return this.profiles().find((p) => p.projectName === name);
  }
  ensureProjects(): void {
    if (this.projectState() === 'loading') void this.loadProjects();
  }
  loadProjects(): Promise<void> {
    this.#projectsLoad ??= this.#loadProjects().finally(() => {
      this.#projectsLoad = undefined;
    });
    return this.#projectsLoad;
  }
  async #loadProjects(): Promise<void> {
    const revision = this.#projectRevision;
    if (!this.profiles().length) {
      const cached = await this.#cache.read('projects');
      if (Array.isArray(cached) && cached.length <= 200 && cached.every(validProfile)) {
        this.profiles.set(cached);
        this.projectState.set('cached');
      }
    }
    try {
      const profiles = await this.#api.projects();
      if (revision !== this.#projectRevision) return;
      this.profiles.set(profiles);
      this.projectState.set('ready');
      await this.#cache.write('projects', profiles);
    } catch {
      this.projectState.set(this.profiles().length ? 'cached' : 'unavailable');
    }
  }
  loadRules(): Promise<void> {
    this.#rulesLoad ??= this.#loadRules().finally(() => {
      this.#rulesLoad = undefined;
    });
    return this.#rulesLoad;
  }
  async #loadRules(): Promise<void> {
    const revision = this.#ruleRevision;
    if (!this.rules()) {
      const cached = await this.#cache.read('rules');
      if (validRules(cached) && revision === this.#ruleRevision) {
        this.rules.set(cached);
        this.ruleState.set('cached');
      }
    }
    try {
      const rules = await this.#api.rules();
      if (revision !== this.#ruleRevision) return;
      this.rules.set(rules);
      this.ruleState.set('ready');
      await this.#cache.write('rules', rules);
    } catch {
      if (revision === this.#ruleRevision)
        this.ruleState.set(this.rules() ? 'cached' : 'unavailable');
    }
  }
  async saveRules(value: PersonalRules): Promise<void> {
    if (this.ruleSave() === 'saving' || !validRules(value)) return;
    ++this.#ruleRevision;
    this.ruleSave.set('saving');
    try {
      const rules = await this.#api.saveRules(value);
      this.rules.set(rules);
      this.ruleState.set('ready');
      this.ruleSave.set('saved');
      await this.#cache.write('rules', rules);
    } catch {
      this.ruleSave.set('failed');
    }
  }
  setRule(field: keyof PersonalRules, value: string): void {
    const rules = this.rules();
    if (rules) void this.saveRules({ ...rules, [field]: Number(value) });
  }
  async saveProfile(value: ProjectProfile): Promise<ProjectProfile> {
    ++this.#projectRevision;
    const profile = await this.#api.saveProject(value);
    this.profiles.update((all) =>
      all.map((p) => (p.projectName === profile.projectName ? profile : p)),
    );
    await this.#cache.write('projects', this.profiles());
    return profile;
  }
}
