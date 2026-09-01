# ADR 009: Tailwind-only styling authoring

- **Status:** Accepted
- **Decision:** Author screen/component styling only with Tailwind utilities. Keep one minimal global Tailwind/token/platform input and never hand-edit generated output.
- **Context:** A single predictable authoring system avoids Ionic-default drift and scattered styles.
- **Alternatives:** SCSS, component CSS, CSS modules, Tailwind CDN, mixed authoring.
- **Consequences:** Class-heavy templates require discipline; central tokens remain small; framework global imports are allowed only when unavoidable.
- **Validation needed:** PWA static checks, Impeccable detector, code review, and future Angular architecture rules.
