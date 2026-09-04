import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { ThemeStore } from './core/theme/theme.store';
import { MotionPreferenceStore } from './core/motion/motion-preference.store';
import { signalRouteTransition } from './core/motion/route-transition';
import { BottomNavigation } from './core/navigation/ui/bottom-navigation';
import { UpdateNotice } from './core/updates/update-notice';
import { ActivitySession } from './features/activity/application/activity-session';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet, BottomNavigation, UpdateNotice],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly transition = signalRouteTransition;
  constructor() {
    inject(ThemeStore).start();
    inject(MotionPreferenceStore);
    inject(ActivitySession);
  }
}
