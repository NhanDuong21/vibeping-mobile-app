import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PullToRefresh } from '../../../core/refresh/pull-to-refresh';
import { OnboardingStore } from '../application/onboarding.store';

@Component({
  selector: 'app-onboarding-page',
  imports: [FormsModule, PullToRefresh],
  templateUrl: './onboarding-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage implements OnInit {
  protected readonly onboarding = inject(OnboardingStore);
  readonly #router = inject(Router);
  protected code = '';

  ngOnInit(): void {
    void this.onboarding.start();
  }

  protected submitCode(): void {
    void this.onboarding.pair(this.code);
  }

  protected begin(): void {
    void this.#router.navigateByUrl('/activity');
  }
}
