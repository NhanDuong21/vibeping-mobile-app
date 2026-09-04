import { createAnimation, type AnimationBuilder } from '@ionic/angular';
import { MOTION_EASE } from './motion-presets';

export const signalRouteTransition: AnimationBuilder = (_base, options) => {
  const minimal =
    document.documentElement.dataset['motion'] === 'minimal' ||
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const entering = options.enteringEl as HTMLElement;
  const leaving = options.leavingEl as HTMLElement | undefined;
  const detail =
    entering.matches('app-event-detail-page, app-thread-detail-page, app-usage-limits-page') ||
    leaving?.matches('app-event-detail-page, app-thread-detail-page, app-usage-limits-page');
  const tabs = ['APP-ACTIVITY-PAGE', 'APP-COMPUTER-PAGE', 'APP-SETTINGS-PAGE'];
  const direction = detail
    ? options.direction === 'back'
      ? -1
      : 1
    : tabs.indexOf(entering.tagName) >= tabs.indexOf(leaving?.tagName ?? '')
      ? 1
      : -1;
  const distance = minimal ? 0 : detail ? 36 : 12;
  const incoming = createAnimation()
    .addElement(entering)
    .beforeRemoveClass('ion-page-invisible')
    .fromTo('opacity', '0.5', '1')
    .fromTo('transform', `translateX(${distance * direction}px)`, 'translateX(0)')
    .afterClearStyles(['opacity', 'transform']);
  const animation = createAnimation()
    .duration(minimal ? 0 : detail ? 340 : 240)
    .easing(MOTION_EASE)
    .addAnimation(incoming);
  if (leaving)
    animation.addAnimation(
      createAnimation()
        .addElement(leaving)
        .fromTo('opacity', '1', '0')
        .fromTo('transform', 'translateX(0)', `translateX(${(-distance * direction) / 2}px)`)
        .afterClearStyles(['opacity', 'transform']),
    );
  return animation;
};
