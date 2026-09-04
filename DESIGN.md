---
name: VibePing
description: A calm private signal from Windows to iPhone.
colors:
  vibe-canvas: "#f3f7f4"
  vibe-surface: "#ffffff"
  vibe-ink: "#10251c"
  vibe-muted: "#587065"
  vibe-rule: "#d7e2dc"
  vibe-night: "#07140f"
  vibe-surface-dark: "#10241b"
  vibe-paper: "#f3f8f5"
  vibe-sage: "#9fb9aa"
  vibe-rule-dark: "#274236"
  vibe-mint: "#45d395"
  vibe-mint-soft: "#d9f8e8"
  vibe-green: "#17643f"
  vibe-amber: "#c78a2e"
  vibe-coral: "#b84b47"
typography:
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    letterSpacing: "-0.035em"
  title:
    fontSize: "1.375rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  row-title:
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontSize: "0.875rem"
    lineHeight: "1.5rem"
  field:
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: "1.25rem"
  metadata:
    fontSize: "0.75rem"
    lineHeight: "1.25rem"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  gutter: "20px"
  xl: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.vibe-ink}"
    textColor: "{colors.vibe-paper}"
    typography: "{typography.label}"
    padding: "0 20px"
  button-primary-dark:
    backgroundColor: "{colors.vibe-mint}"
    textColor: "{colors.vibe-ink}"
  text-field:
    textColor: "{colors.vibe-ink}"
    typography: "{typography.field}"
    rounded: "{rounded.md}"
    padding: "0 12px"
  session-prominent:
    backgroundColor: "{colors.vibe-surface}"
    textColor: "{colors.vibe-ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  session-prominent-dark:
    backgroundColor: "{colors.vibe-surface-dark}"
    textColor: "{colors.vibe-paper}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: VibePing

## Overview

**Creative North Star: "Quiet signal"**

VibePing is an operational utility. The interface should feel calm, precise, and trustworthy when glanced at on a phone. Status and next action outrank decoration. It is not a marketing page, analytics dashboard, chat client, or cyberpunk control panel.

Personal extends the incumbent world through familiar project identities, ordinary Settings controls and a small daily recap. Always ready is represented on the phone as a factual Windows status section. This record describes the implemented and tested feature; it does not claim that Always ready has been enabled on the user's installed host.

**Key Characteristics:**

- Tinted fields, sparse rules and restrained semantic color.
- Local system type with clear status, task and metadata hierarchy.
- One persistent work identity with separate requests, recorded time and retained final results.
- A whole-image mascot with bounded, state-aware motion.
- Plain Vietnamese, visible focus and explicit saved or unconfirmed states.

The accepted light and dark captures in `.impeccable/review/personal`, including the 320 px and 1024 px profiles and stale Windows state, support the recorded form. The finish verdict resolves both scored fixes. The native Windows tray was not visually captured; this document records its mobile status presentation only.

The 1.3 light and dark captures in `.impeccable/review/work-details` record the compact idle/feed presentation, latest and previous request content, and single-request detail at phone widths, with a centered feed at 1024 px. The work-detail rules below follow the built source; capture fixture content does not establish product names or result copy.

## Colors

Green-tinted neutrals carry the interface; mint is a calm signal accent, with restrained amber and coral for exceptions. The frontmatter preserves the central source tokens from `apps/mobile/src/styles.css`.

### Primary

- **Signal mint** (`vibe-mint`) carries readiness, focus, enabled switches, selected navigation and primary action in dark mode.
- **Deep signal green** (`vibe-green`) keeps accent text readable on light backgrounds.
- **Soft mint** (`vibe-mint-soft`) supplies quiet selected-state fills.

### Secondary

- **Attention amber** (`vibe-amber`) marks waiting, checking or unconfirmed status.
- **Failure coral** (`vibe-coral`) marks failed or disconnected operational states where the component calls for it.

### Neutral

- **Tinted canvas / green-black night** (`vibe-canvas`, `vibe-night`) are the page grounds.
- **White / dark green surface** (`vibe-surface`, `vibe-surface-dark`) distinguish necessary containers.
- **Deep ink / pale paper** (`vibe-ink`, `vibe-paper`) carry primary text and contrasting primary-action text.
- **Muted green / soft sage** (`vibe-muted`, `vibe-sage`) carry metadata, timestamps and supporting copy.
- **Pale / dark green rules** (`vibe-rule`, `vibe-rule-dark`) separate rows and sections without heavy framing.

Light is the default for a calm, readable first launch. Light, dark, and system themes remain first-class choices in product settings, and a user's later choice is retained. Theme changes must preserve semantic color meaning and contrast.

**The Quiet Accent Rule.** Project color belongs to the small identity icon beside the project name. It does not recolor the page or replace the separate textual operational state. The selector labels are “Xanh bạc hà”, “Xanh dương”, “Xanh lá”, “Hổ phách” and “San hô”; retain the Vietnamese label “Xanh bạc hà” for the internal mint choice.

## Typography

**Display and body font:** the same local system UI stack in the frontmatter. No external font or icon CDN. The system face is an operational reading face; hierarchy comes from size, weight and whitespace rather than expressive display typography.

### Hierarchy

- **Headline:** compact bold page and project names, wrapping when long.
- **Title:** section headings and the prominent work title.
- **Row title:** bold project, work and request-disclosure labels.
- **Body:** supporting copy, state and duration; longer explanations use the relaxed body line height.
- **Field:** native input and select values stay larger than their labels.
- **Label:** short bold form labels and actions.
- **Metadata:** source project names, timestamps and notes remain secondary. Timestamps and recap values use tabular numerals.

All visible client copy is plain Vietnamese. Lead with current state and recovery action. Never show raw protocol names, stack traces, HTTP statuses, database errors, or internal identifiers. A secondary copyable technical report may expose sanitized diagnostics only after explicit expansion.

## Layout

Hierarchy comes from size, weight, and whitespace rather than display typography. Body copy stays comfortably readable at phone distance. Use a 4 px spacing basis, with 8/12/16/24/32 px as the common rhythm; leave more space above a new section than below its heading.

Prefer open layout, clear rules and sparse containers. The Personal and Settings pages use a centered single column with a maximum width of 32 rem and 20 px side gutters. Major Settings sections begin after 32 px and a rule, with 24 px top padding. Icon and accent fields share two equal columns with a 12 px gap; notification controls remain full-width rows. The same narrow measure stays centered in the captured 1024 px layout.

Design mobile-first at 320, 375, 390, and 430 px. Respect iPhone safe areas and dynamic text, prevent horizontal overflow, keep a logical semantic outline, preserve keyboard focus, use live regions sparingly, and never communicate state by color alone.

Long project identifiers wrap beneath the editable display name. Labels, native select values and disclosure arrows must fit the 320 px form. The existing main tabs remain Hoạt động, Máy tính and Cài đặt. Project lists and profiles are reached through Cài đặt and use a back link; their subpages do not retain the main bottom bar. Main tab pages reserve space for the fixed navigation and bottom safe area.

## Elevation & Depth

The system is flat at rest: tinted grounds, rules and a small number of contrasting surfaces establish depth. The prominent session has a border, not a cast card shadow. Keep the existing small switch-thumb shadow as a control affordance; it does not establish a general card-elevation vocabulary. The timeline dot's ground-colored ring keeps its sequence line legible. Focus is explicit with a mint outline (3 px) and offset (3 px).

## Shapes

Necessary containers use gentle 12–16 px corners, with smaller 8 px corners for control selections. Inputs and native selects use a 12 px corner, a thin theme-aware rule border, 12 px horizontal padding and a minimum 48 px height. Switch tracks, navigation selection marks and status dots are rounded. Primary actions remain at least 44×44 px; the profile save action fills the column and is at least 48 px tall.

Project identity icons are small outlined SVGs (16 px), paired with readable text. Available choices are Mèo, Nhịp tim, Lớp học, Mã nguồn and Tia sáng. Use the official local VibePing app icon in product mastheads and install surfaces; do not substitute a text lettermark or redraw the mascot as an icon.

## Components

### Buttons and fields

Actions are direct and compact. Primary controls use deep ink with pale text in light mode and mint with deep ink in dark mode. Secondary recovery actions use readable text, underline where present, and the global focus outline. Retain touch feedback and clear disabled states; permission follows a direct tap.

Fields show a bold label above the native input or select with an 8 px gap. Notification switches sit at the trailing edge of rule-separated rows with at least 56 px row height and a 44 px switch hit area. The visible track is 48×28 px with a white 20 px thumb. Enabled mint is paired with the switch's accessible checked state.

### Project profile and notification rules

Profiles follow the Settings form: back link, editable display name, original project name, two icon/accent selectors, project notification switches, bounded threshold selectors, full-width save action, then project work history. The display name is limited to 60 characters; the source name remains secondary context.

**The Confirmed Identity Rule.** Shared project names, icons and accents change only after a successful save. Keep failed edits available to retry, show “Đã lưu hồ sơ dự án.” after success, and label cached profiles explicitly. The editor may show its draft; activity and other shared identity surfaces retain the confirmed profile until it is saved.

Global notification types remain master controls. A project receives a type only when enabled both globally and for that project; quiet hours still apply. The four project types are completed work, Codex waiting, final tests not passing and ready previews. Global allowance controls remain separate.

Completion thresholds offer every job, 2 minutes or 5 minutes. Waiting reminders offer off, once after 5 minutes or once after 10 minutes. Project selectors add “Theo cài đặt chung” for inheritance. Keep these bounded choices in ordinary selects; this is not a rule builder. The global explanation states that a missing start time still permits a completion notification and that return-needed work and final test failure follow their selected notification types and quiet hours.

Project history reuses the compact work row and direct detail path. Retain current state and full final-answer access. Cached history is labeled and offers retry; previous-page loading and failure have explicit actions.

### Windows readiness

“Sẵn sàng trên Windows” is a rule-separated Settings section with a small status dot, bold Vietnamese state, secondary context and “Kiểm tra lại laptop”. The phone reports the local companion and explains that startup and tray actions happen on Windows; it offers no phone-side Start or Stop.

**The Dated Readiness Rule.** A previous successful check must not remain a present-tense healthy claim after it loses freshness. While checking, stale or unavailable, show the corresponding state and the previous “Lần kiểm tra trước” date/time when available; show the sign-in setting only with a current ready result. Invalidate on hide, refresh on foreground return, page return and reconnection, and check every 30 seconds while visible. An enabled host heartbeat older than 75 seconds remains stale.

The visible explanation points to the Windows package's “Bật Sẵn sàng” action and local tray. It states that stopping waits for a manual start or the next opted-in Windows sign-in. Native tray styling and appearance are outside this visual record.

### Work feed and inline request details

**The Persistent Work Rule.** One Codex thread keeps one top-level identity across prompts, labeled Công việc. Each prompt is a Yêu cầu. New requests update the count and latest state; separate threads in the same project remain separate. Show the most recently updated running work or a current actionable work in the prominent card, without repeating it in the list. When idle, use a small Codex đang nghỉ block. Other rows are grouped under Đang làm việc, Cần chú ý and Gần đây only when populated. History without thread identity remains independently accessible under Hoạt động cũ.

Active work retains the existing bordered surface, 16 px corners and padding, local icon and 22 px title. Recent work uses open, rule-separated rows with 16 px bold titles, project on one line, request count, state/time, one readable result sentence and a chevron. Long titles use at most two lines. The entire row is one focusable link with a 44 px minimum target; omit repeated CTA and signal metadata.

**The Observed Time Rule.** Show recorded stages and timestamps only. The prominent active card shows the current request's real duration and latest stage. Missing starts are explained inside detail. Stale or disconnected work freezes duration at its last signal and stops live motion. Work detail can show recorded start and update times, but never presents their span as total work duration.

**The Two-Level Reading Rule.** Activity opens Chi tiết công việc with the latest request's full timeline and Codex answer already visible. Older requests use Yêu cầu trước đó disclosure rows that expand in place, independently, without another route. The latest uses Yêu cầu gần nhất. A work with one request omits these labels and counters. Older pages load on demand. Existing event and notification links resolve to work detail with the exact requested answer expanded. Cached answers are labeled and offer retry.

Full results preserve stored headings, lists, code and original content; a truncated stored answer explicitly directs the user to Codex for the rest. Timeline markers retain tabular timestamps, the thin connecting line and established semantic colors. Privacy remains collapsed. Resolved test failures no longer flag the work as needing attention; their original timeline markers remain visible. Result excerpts in both current and legacy feed rows select a readable sentence, exclude internal review output, code and paths, and fall back to Đã có kết quả từ Codex when none remains. Without an excerpt, request rows can use the last recorded stage and legacy events use their safe summary or title fallback. Safe retained names remain titles; missing or internal names become Công việc VibePing · HH:mm. The existing mascot, bottom navigation, themes and allowance motion remain in place.

**The Fresh Detail Signal Rule.** Beside the detail's working state, show one decorative three-bar signal (24 px) only for the selected running session with fresh evidence under 120 seconds old. Full uses a gentle scaleY/opacity loop (2.4 seconds); Balanced, Minimal and system reduced motion keep the static mark. Cancel the loop when hidden or offscreen. Remove the mark for waiting, terminal, offline or stale states. Keep the status text still and authoritative, with the timeline and retained final answer in their existing reading order.

### Daily recap

“Hôm nay” is four quiet definition-list rows below Activity: “Yêu cầu đã theo dõi”, “Công việc hoàn tất”, “Lần kiểm thử chưa đạt” and “Thời gian ghi nhận”. Muted labels sit opposite right-aligned bold tabular values, with 12 px row gaps. It has no chart, score or dashboard card grid.

Observed time runs from the recorded start to the last signal; overlapping intervals count once. Keep that explanation under the rows, prefix cached summaries with “Tổng kết đã lưu.”, and show loading or reconnection copy when no summary is available. The recap does not imply total working time beyond observed evidence.

### Whole-image mascot and motion

The masthead keeps the official cat PNG whole: a 40 px image within a 48 px companion area. Motion transforms the intact image and adds restrained SVG status marks, a ring or brief completion sparkles. Working/resting can breathe; waiting has a sparse small sway; completion acknowledges the event; failure shakes briefly. Offline, stopped and unconfirmed states share the subdued grayscale image and dashed ring. A small coffee mark can appear only for observed work exceeding 30 minutes. Nearby text remains the operational authority.

Motion is a core layer of VibePing Alive: a private signal travelling from the laptop to the iPhone. Keep the Quiet signal palette and open composition. Use state motion, brief event celebrations, navigation continuity, animated allowance changes, and physical touch feedback. Spring, local ripple, SVG path drawing, and bounded stagger are appropriate when they explain a real state or action.

The focal sequence is a new live signal: status acknowledgment, feed insertion, then unread feedback. Event identifiers prevent replay after REST reconciliation or reconnect. Never invent task progress or keep old data visually live. The connection diagram describes readiness, not proof of physical notification delivery.

Full (Tối đa) is the default; Balanced (Vừa phải) keeps brief state feedback; Minimal (Tối giản) keeps static, textual feedback. System reduced motion overrides the local level immediately. Pause loops offscreen, on hidden Ionic pages, and in the background. At most two coordinated focal loops run per viewport. Use transform/opacity or bounded SVG strokes; avoid perpetual blur, shadow painting, or decorative timers.

Timing: touch feedback 140–180 ms, navigation 240–340 ms, state changes 350–460 ms, event acknowledgment up to 760 ms; cap stagger at 240 ms. Content stays available throughout. Primary actions remain at least 44×44 px and permission follows a direct tap.

The mascot cancels its Web Animations when motion is disabled or it leaves the viewport, does not replay the initial state as a new event, and reserves ambient loops for Full. Completion sparkles have a bounded 900 ms fade; this local decoration does not delay state text or interaction.

### Saved allowance and Lock Screen previews

Saved Codex limits remain visible when disconnected, labeled as the last reading with its original local date and time. Keep the existing percentage hierarchy and theme tokens; never imply that a cached reset deadline refreshes the numbers. Use one restrained notice on the detail page and a secondary timestamp in the activity summary.

Lock Screen previews inherit the same theme and use the local app icon with an app-name/time header, event title, and a single short body. The three privacy modes show event only, project only, or task plus project; examples come from the latest eligible event or are explicitly labeled illustrative. Share the backend renderer with actual delivery. Crossfade only when revealing more detail; remove previous details immediately when restricting privacy, and disable motion for reduced-motion users.

## Do's and Don'ts

### Do:

- **Do** keep status, task and next action ahead of decoration, with readable Vietnamese text accompanying every state color.
- **Do** preserve work and request identities, observed timestamps, final-answer access and explicit cached-state labels across Personal integrations.
- **Do** use confirmed project identity in shared views, retaining failed drafts for retry.
- **Do** keep global notification types and quiet hours visible as the authority for project filtering.
- **Do** refresh Windows readiness on return and show dated previous evidence when current readiness is unknown.
- **Do** stop mascot loops offscreen, on hidden pages and under reduced motion; keep the PNG intact.

### Don't:

- **Don't** add nested cards, giant heroes, decorative gradients, glass effects, fake charts or ornamental badges.
- **Don't** turn a project accent into a page theme or use it to imply operational status.
- **Don't** present cached numbers, old host checks or unobserved time as current live evidence.
- **Don't** add phone-side runtime controls, a chat surface or a new Personal tab.
- **Don't** replace the local app icon with a text lettermark or expose raw technical errors.

**Authoring discipline:** Tailwind utilities are the only screen/component styling authoring system. One minimal global input file may contain the Tailwind import, central tokens, and unavoidable platform primitives. Do not add SCSS, Sass, component CSS, large selector stylesheets, Tailwind CDN, or visual reliance on default Ionic styles.

**Workflow discipline:** Every user-visible surface uses the project-local Impeccable skill. New work records product truth, shapes the task, establishes or inherits the visual world, then applies the craft floor. Gate 0 specifically uses shape, critique, harden, and adapt, with one bounded screenshot/fix pass and one confirmation pass. Product constraints override generic visual ambition.

**Not canonized:** The uncaptured native tray appearance, fixture-specific names/counts, captured internal result text and the inherited empty Activity heading in the review captures are not design-system rules. No visual defect is promoted into a reusable token by this update. The 1.3 refinement introduces no new palette, type scale, raster pixels or visual world.
