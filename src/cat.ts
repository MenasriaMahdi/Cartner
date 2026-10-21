import { requireElement } from "./dom";
import type { CatState } from "./types";

const catLayer = requireElement("cat-layer");
// The hand-drawn art skin mirrors the same state classes as the SVG layers.
const catArt = document.getElementById("cat-art");
const bubble = requireElement("bubble");

let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
let reminderTimer: ReturnType<typeof setTimeout> | undefined;

export function setCatState(state: CatState): void {
  for (const el of [catLayer, catArt]) {
    if (el === null) continue;
    el.classList.remove("walking", "reminder");
    if (state === "walking" || state === "reminder") {
      el.classList.add(state);
    }
  }
}

export function pokeCat(): void {
  for (const el of [catLayer, catArt]) {
    if (el === null) continue;
    el.classList.remove("poke");
  }
  // force a reflow so the one-shot squash animation restarts
  void catLayer.getBoundingClientRect();
  for (const el of [catLayer, catArt]) {
    if (el === null) continue;
    el.classList.add("poke");
  }
}

export function showBubble(text: string): void {
  bubble.textContent = text;
  bubble.classList.add("show");
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove("show"), 4200);
}

export function pulseReminder(): void {
  setCatState("reminder");
  clearTimeout(reminderTimer);
  reminderTimer = setTimeout(() => setCatState("idle"), 1300);
}

// Idle wandering: occasionally take a short stroll in place.
function startStroll(): void {
  setCatState("walking");
  setTimeout(() => {
    setCatState("idle");
    scheduleIdleCycle();
  }, 2400 + Math.random() * 2000);
}

function scheduleIdleCycle(): void {
  setTimeout(() => {
    if (Math.random() < 0.45) {
      startStroll();
    } else {
      scheduleIdleCycle();
    }
  }, 9000 + Math.random() * 12000);
}

export function startIdleCycle(): void {
  scheduleIdleCycle();
}
