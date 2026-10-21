---
name: Mochi Lifecycle
description: Architecture rules for Mochi's Tauri shell — windows, tray, commands, capabilities, events, persistence schema. Use when changing app structure, tray, permissions, settings schema, or adding features.
---

## Windows & tray (fixed)

- Two webviews total: `main` (transparent, always-on-top, 176×176, skipTaskbar,
  no decorations, shadow off) and `settings` (hidden until toggled, centered).
- Closing either window = `hide()`, enforced in Rust
  (`CloseRequested → prevent_close`). The app only exits via tray/context
  "Exit" (`exit_app`) — never by closing windows.
- Tray: show / hide / settings / exit, event IDs matched in `lib.rs`.
  `Settings` from tray and context menu both go through the single Rust
  command `toggle_settings_window`.

## Cross-window flow (do not fork it)

- Persistence owner = whichever window calls `saveSettings()`; it broadcasts
  the **complete** settings object on `mochi:settings-changed`; all listeners
  re-sanitize via `sanitizeSettings()` and never re-save.
- Event names are namespaced `mochi:*`. Registry (keep updated):
  - `mochi:settings-changed` — full sanitized `AppSettings` payload.

## Settings schema rules

- One storage key: `mochi.settings.v1`. Bump the `v1` suffix only for breaking
  shape changes, and keep the old key readable for one release (migrate, then
  delete).
- Unknown/invalid stored fields must degrade silently to defaults
  (`sanitizeSettings`/`sanitizeReminder`/`sanitizeInterval`) — never crash, never
  reset unrelated fields. Any new field gets a default + a sanitize rule in
  `state/settings.ts` and is included in `AppSettings` typing.
- Interval bounds live in `REMINDER_MINUTES_MIN/MAX` — sanitize before use.

## Capabilities & commands

- `src-tauri/capabilities/default.json` grants only what demo'd features need.
  Additions must be justified in the PR/commit message with the feature name.
- Custom app commands (`exit_app`, `toggle_settings_window`) are the pattern;
  keep commands trivial (orchestrate, no business logic) and stateless.
- Desktop-only app: never add mobile-only config that risks the desktop path.

## Expansion bans (V-scope discipline)

- No: servers, databases, cloud, accounts/sync, AI, notes/task managers,
  background daemons, auto-updaters, telemetry, analytics.
- New features must be expressible within the existing two windows + tray +
  notification plugin. If not, propose the change to the user first with the
  memory/complexity price written down.

## Definition of done for any change

1. `npm run check` (tsc strict), `npm run build`, `cargo check` — all clean.
2. Manual: relaunch exe → drag, poke, right-click menu, settings save from
   both entry points (tray + context menu), reminder fire overridden by
   temporarily setting the interval to 1 minute.
3. Then load the `mochi-perf-review` skill and run its checklist.
