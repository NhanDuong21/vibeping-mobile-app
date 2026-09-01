# ADR 004: Angular/Ionic/Tailwind Home Screen PWA

- **Status:** Accepted for future V1; not implemented in this phase
- **Decision:** Use Angular 22, Ionic Angular 9, Tailwind CSS, Signals, RxJS, and a Home Screen PWA. No Capacitor package.
- **Context:** iPhone delivery must work without Apple distribution or paid infrastructure.
- **Alternatives:** Native Swift/TestFlight, Capacitor, React/Vue PWA, plain JS product.
- **Consequences:** iOS Home Screen installation and Web Push constraints are first-class. Ionic supplies suitable platform/navigation primitives, not the visual system.
- **Validation needed:** Gate 0 isolates origin/push behavior before framework work; later mobile walking-skeleton tests validate framework integration.
