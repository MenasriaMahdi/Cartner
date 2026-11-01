# 🐱 Cartner

A tiny desktop cat that lives on your screen, nags you to drink water, and keeps
your little to-dos honest. Built for Windows with Tauri 2 — no Electron, no
runtime to install, ~7 MB binary, ~0% idle CPU.

## What Cartner does

- **Lives on your desktop** — a small, always-on-top cat you can drag anywhere.
  She idles, strolls, sleeps after 5 quiet minutes, and reacts when you poke her.
- **Reminders** — Drink and Eat reminders come built in (with their own little
  animations), and you can add your own recurring ones: name, emoji, interval,
  on/off. Fire as a speech bubble *and* a native notification.
- **Right-click menu** — a designed popup at your cursor: toggle reminders,
  pick the cat's mood (Normal / Happy / Sleepy / Grumpy / Sad), open Tasks or
  Settings, Exit.
- **Tasks widget** — small to-do list with optional due times; Cartner reminds
  you right when a task is due.
- **Moods stick around** — she stays sleepy or grumpy until you change it.
- **Hand-drawn skin** — switch between the classic vector cat and the pixel-art
  cat drawn by hand (Settings → "Pixel cat").

Everything (settings, tasks, mood) is stored locally. No accounts, no network.

## Run a test build

1. Download `Cartner-<version>-windows-x64.zip` from
   [Releases](../../releases) and extract it.
2. Double-click `cartner.exe`. That's it — Windows 10/11 ships the WebView2
   runtime it needs.
3. Right-click the cat to get the menu; Settings is where the reminders live.

Found something odd? [Open an issue](../../issues) — include what you clicked
and what happened.

## Build it yourself

Prerequisites: [Node.js](https://nodejs.org) 20+ and the
[Rust toolchain](https://rustup.rs).

```bash
npm install
npm run tauri dev       # live-reload dev build
npm run tauri build     # release binary → src-tauri/target/release/cartner.exe
```

## Project layout

```
src/                 cat, menu, reminders, tasks, settings (vanilla TypeScript)
src-tauri/           the Tauri 2 shell: windows, tray, commands (Rust)
public/cat-art/      packaged sprite frames for the moods
assets/              the artist's original, full-resolution art
```

Maintenance notes live in `.opencode/skills/` (architecture rules and a
performance checklist).

## License

The hand-drawn cat artwork is by the author and is not redistributable without
permission. The code's license is to be decided — pick one before sharing this
publicly.
