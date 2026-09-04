# VibePing design direction

## Quiet signal

VibePing is an operational utility. The interface should feel calm, precise, and trustworthy when glanced at on a phone. Status and next action outrank decoration. It is not a marketing page, analytics dashboard, chat client, or cyberpunk control panel.

## Visual system

- Use a tinted off-white ground in light mode and green-black ground in dark mode.
- Reserve a calm mint/green accent for readiness, focus, and primary action; warnings and failures use restrained amber and red.
- Prefer open layout, clear rules, and sparse containers. Avoid nested cards, giant heroes, decorative gradients, glass effects, fake charts, and ornamental badges.
- Use a local system UI stack: `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif. No external font or icon CDN.
- Use the official local VibePing app icon in product mastheads and install surfaces; do not substitute a text lettermark.

## Type and spacing

Hierarchy comes from size, weight, and whitespace rather than display typography. Body copy stays comfortably readable at phone distance. Use a 4 px spacing basis, with 8/12/16/24/32 px as the common rhythm; leave more space above a new section than below its heading.

## Themes

Light is the default for a calm, readable first launch. Light, dark, and system themes remain first-class choices in product settings, and a user's later choice is retained. Theme changes must preserve semantic color meaning and contrast.

## Authoring rules

Tailwind utilities are the only screen/component styling authoring system. One minimal global input file may contain the Tailwind import, central tokens, and unavoidable platform primitives. Do not add SCSS, Sass, component CSS, large selector stylesheets, Tailwind CDN, or visual reliance on default Ionic styles.

## Interaction and motion

Motion is a core layer of VibePing Alive: a private signal travelling from the laptop to the iPhone. Keep the Quiet signal palette and open composition. Use state motion, brief event celebrations, navigation continuity, animated allowance changes, and physical touch feedback. Spring, local ripple, SVG path drawing, and bounded stagger are appropriate when they explain a real state or action.

The focal sequence is a new live signal: status acknowledgment, feed insertion, then unread feedback. Event identifiers prevent replay after REST reconciliation or reconnect. Never invent task progress or keep old data visually live. The connection diagram describes readiness, not proof of physical notification delivery.

Full (Tối đa) is the default; Balanced (Vừa phải) keeps brief state feedback; Minimal (Tối giản) keeps static, textual feedback. System reduced motion overrides the local level immediately. Pause loops offscreen, on hidden Ionic pages, and in the background. At most two coordinated focal loops run per viewport. Use transform/opacity or bounded SVG strokes; avoid perpetual blur, shadow painting, or decorative timers.

Timing: touch feedback 140–180 ms, navigation 240–340 ms, state changes 350–460 ms, event acknowledgment up to 760 ms; cap stagger at 240 ms. Content stays available throughout. Primary actions remain at least 44×44 px and permission follows a direct tap.

## Copy and errors

All visible client copy is plain Vietnamese. Lead with current state and recovery action. Never show raw protocol names, stack traces, HTTP statuses, database errors, or internal identifiers. A secondary copyable technical report may expose sanitized diagnostics only after explicit expansion.

Saved Codex limits remain visible when disconnected, labeled as the last reading with its original local date and time. Keep the existing percentage hierarchy and theme tokens; never imply that a cached reset deadline refreshes the numbers. Use one restrained notice on the detail page and a secondary timestamp in the activity summary.

## Responsive and accessibility bar

Lock Screen previews inherit the same theme and use the local app icon with an app-name/time header, event title, and a single short body. The three privacy modes show event only, project only, or task plus project; examples come from the latest eligible event or are explicitly labeled illustrative. Share the backend renderer with actual delivery. Crossfade only when revealing more detail; remove previous details immediately when restricting privacy, and disable motion for reduced-motion users.

Design mobile-first at 320, 375, 390, and 430 px. Respect iPhone safe areas and dynamic text, prevent horizontal overflow, keep a logical semantic outline, preserve keyboard focus, use live regions sparingly, and never communicate state by color alone.

## Components

### Work session card and timeline

**The Persistent Session Rule.** One Codex request keeps one card identity as it moves from observed work to a completion summary. A later request gets a separate card, even in the same task or project. Keep the task title first, followed by project, plain-language state and observed duration; completion retains failed-test count when present and a short final-answer excerpt when available.

The prominent session uses the existing bordered surface with 16 px corners and 16 px padding, the local app icon, and a 22 px bold title. Earlier sessions use open, rule-separated rows with 16 px bold titles. State and duration use 14 px text; project and last-signal metadata use 12 px muted text. Long titles and metadata wrap, and the entire card remains a focusable detail link with at least a 44 px touch target.

**The Observed Time Rule.** Show recorded stages and timestamps only. The prominent active card shows the three most recent stages in a compact time-and-label list. Duration uses a recorded start; missing starts remain explicit. When an unfinished session becomes stale or loses a current signal, freeze duration at the last observed signal and label the saved or unconfirmed state in text. Live motion must stop with that loss of freshness. Completion fixes duration at the recorded finish.

Detail presents the full retained timeline before the final Codex answer. Use an ordered list with tabular timestamps, a thin mint connecting line, small decorative mint dots, and plain Vietnamese stage labels. The line conveys sequence, never progress percentage. Keep the existing readable answer surface and place the privacy explanation in a collapsed disclosure after the result and metadata.

## Impeccable workflow

Every user-visible surface uses the project-local Impeccable skill. New work records product truth, shapes the task, establishes or inherits the visual world, then applies the craft floor. Gate 0 specifically uses shape, critique, harden, and adapt, with one bounded screenshot/fix pass and one confirmation pass. Product constraints override generic visual ambition.
