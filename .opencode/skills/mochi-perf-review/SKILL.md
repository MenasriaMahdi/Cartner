---
name: Mochi Performance Review
description: Resource guardrails + review checklist for the Mochi desktop cat app (Tauri 2 + vanilla TS). Use after adding or changing any feature, timer, listener, dependency, persistence, or asset — and before committing.
---

## Mission

Mochi is a companion that runs for hours while the user does other things.
It must behave like a piece of furniture: **~0% idle CPU, a stable low RAM
footprint, and near-instant response**. Realism note: the WebView2 runtime
puts a floor of roughly 30–60 MB total process memory; the goal is that we
never grow past that floor, not literally zero bytes.

## Hard budgets (violate only with a written, user-approved reason)

| Metric               | Budget                                                          |
| -------------------- | --------------------------------------------------------------- |
| Frontend JS total    | ≤ 40 kB minified (`dist/assets/*` combined)                     |
| Runtime deps         | none beyond `@tauri-apps/api` + `@tauri-apps/plugin-notification` |
| Rust crates          | only `tauri` (with `tray-icon`) + `tauri-plugin-notification`    |
| Idle CPU             | ~0% when the user is not interacting (seconds-scale timers only) |
| Largest asset        | cat art ≤ 10 kB (it is currently inline SVG ≈ 2 kB)              |
| Windows              | exactly 2 webviews (cat + hidden settings), no more              |

## Forbidden patterns

- `setInterval`; use single-shot `setTimeout` chains instead.
- Any animation loop (`requestAnimationFrame`, canvas loops, JS-driven frames).
  Animations are CSS keyframes on `transform`/`opacity` only (compositor-run,
  halted cost while idle).
- Polling of any state; use Tauri events (`listen`/`emit`) or OS callbacks.
- Per-event runtime allocations that accumulate: every `listen`/timer that is
  not needed forever must either be single-shot, `clearTimeout`-guarded on
  re-fire, or unlistened.
- New features that add background servers, databases, cloud, accounts, or AI.
- Growing the reminder system beyond compare-before-reschedule (dragging the
  cat must never reset a pending reminder).

## Required patterns (already established — keep them)

- Single persistence path: writers go through `saveSettings()` (writes
  localStorage, broadcasts `mochi:settings-changed`). Listeners never re-save
  (no echo loops).
- Event payloads are always re-sanitized with `sanitizeSettings()` before use.
- Window position saves debounced ≥ 400 ms after the last `tauri://moved`; no
  writes while the native drag is still active.
- All timers whose lifetime is not "app ends" must be cleared with
  `clearTimeout` before creating a replacement.

## Review checklist (run when this skill is loaded)

1. `npm run check` and `npm run build` — clean, note `dist` JS total in report.
2. `cargo check` in `src-tauri` — clean, 0 warnings.
3. Grep new code for: `setInterval`, `requestAnimationFrame`, `MutationObserver`,
   polling loops, `new Notification` outside `reminders.ts`, direct
   `localStorage` writes outside `state/settings.ts` (read-only is fine).
4. Launch the debug exe, let it idle 60 s: confirm Task Manager shows ~0.0–0.1%
   CPU and RAM within ~5 MB of the previous run.
5. If a new permission/command was added to `src-tauri/capabilities/default.json`
   or `generate_handler`, it must map to a user-visible behavior and be the
   narrowest grant available.
6. Report one line per finding: file, issue, fix. Fix before commit.
