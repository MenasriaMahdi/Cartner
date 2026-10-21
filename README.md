# Mochi 🐱

A tiny, lightweight desktop cat companion for Windows. Mochi sits on your
desktop, walks around a little, pokes when clicked — and kindly reminds you
to drink water and eat.

Built with **Tauri 2 + vanilla HTML/CSS/TypeScript** (no framework, no
database, no background servers). The app spends almost all of its time idle.

## Features (V1)

- Transparent, always-on-top, draggable desktop cat (168×168 px window)
- Idle animation: breathing, blinking, tail wag, occasional strolls
- Right-click cat → tiny menu: drink/eat reminder toggles, settings, exit
- Drink & eat reminders (custom interval) with native desktop notifications
  + a speech bubble above the cat
- Tiny settings window (enabled + interval per reminder)
- System tray: show/hide cat, settings, exit
- Settings + cat position persisted in `localStorage`

## Development

Requirements: Node.js, Rust (stable MSVC), MSVC Build Tools.

```powershell
npm install
npm run tauri dev      # dev app with hot reload
```

Type check only:

```powershell
npm run check
```

Build a debug binary without an installer:

```powershell
npm run tauri build -- --debug --no-bundle
# → src-tauri/target/debug/mochi.exe
```

Full release build (installers in `src-tauri/target/release/bundle/`):

```powershell
npm run tauri build
```

## Project layout

```
index.html            cat window markup (SVG cat, bubble, context menu)
settings.html         tiny settings window markup
src/
  main.ts             cat window bootstrap (drag, menu, reminders, position)
  main-settings.ts    settings window logic
  cat.ts              cat state machine + idle animation cycle
  drag.ts             native window dragging + position persistence
  contextMenu.ts      right-click menu
  reminders.ts        reminder timers + native notifications
  state/settings.ts   typed settings load/save/broadcast (localStorage)
  types.ts            CatState, ReminderSettings, AppSettings
scripts/make-icon.ps1 regenerates the placeholder app icon (assets/cat.png)
src-tauri/            Tauri app (window config, tray, permissions, Rust)
```

## Replacing the placeholder cat

The cat is an inline SVG in `index.html` with CSS-driven part animations
(`#cat-tail`, `#cat-eyes`, `#cat-layer`, `.foot-*`). To use real sprite
assets later, swap the SVG for an `<img>`/sprite sheet and drive the same
state classes (`idle`, `walking`, `reminder`, `poke`) from `src/cat.ts` —
no other module needs to change.
