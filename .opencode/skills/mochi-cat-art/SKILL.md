---
name: Mochi Cat Art
description: How to animate/redraw Mochi the cat (inline SVG + CSSCompositor rule). Use when changing cat visuals, adding states or poses, or replacing the placeholder SVG with sprite sheets.
---

## Current model

The cat is an inline `<svg id="cat">` in `index.html`. Iconography rules:

- Whole-cat wrappers: `#cat-layer` (state animations) → `#cat-root` (breathing).
- Parts carry stable IDs/classes so CSS can target them independently:
  `#cat-tail`, `#cat-eyes`, `.ear`, `.foot-l`, `.foot-r`, `#cat-shadow`.
- All SVG CSS transforms use `transform-box: view-box` and explicit
  `transform-origin` in user units (e.g. tail pivots at `36px 88px`).

## State machine (`src/cat.ts`)

`idle` → optional `walking` (random stroll every 9–21 s) → `reminder`
(wiggle + bubble) → back to `idle`. `poke` is a one-shot squash on mousedown.
States are classes on `#cat-layer`; CSS owns all timing. Keep it that way.

## Rules when touching visuals

- Only `transform` and `opacity` may be animated. Never animate
  width/height/position/filter (layout/paint → CPU + battery).
- One-shot animations use class add + forced reflow
  (`void el.getBoundingClientRect()`) to restart — see `pokeCat()`.
- Wrap-around timing via `animationiteration` counts or explicit
  `setTimeout` durations that match the keyframe duration exactly.
- `prefers-reduced-motion` must keep working (`src/style.css` disables motion).
- New art/poses must stay inside the pacing bounds: content fits viewBox
  `0 0 120 120` and stays visible within the 176×176 window at ±13 px X paces.
- Total art weight budget ≤ 10 kB. If a sprite sheet is used instead of SVG,
  prefer a single PNG ≥ ≤10 kB, `image-rendering: pixelated`, and swap
  `background-position` (still transform/opacity-classed — no JS filmstrips).
- Deriving a new state? Add it to `CatState` in `src/types.ts` first, handle it
  in `setCatState()`, then pure CSS. Do not add per-frame JS.

## Replacing the placeholder (future real artist assets)

1. Keep the element wrapper `<div id="cat">` if switching from SVG.
2. Map old part selectors to sprite regions in CSS only (`state classes`
   unchanged), so `cat.ts` / `reminders.ts` / `drag.ts` need zero edits.
3. Delete the SVG from `index.html` only after the new art passes all states
   (idle, walking, reminder wiggle, poke, blink, tail wag).
