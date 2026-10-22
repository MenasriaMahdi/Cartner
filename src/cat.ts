import { requireElement } from "./dom";
import type { CatMood, CatState } from "./types";

const catLayer = requireElement("cat-layer");
// The hand-drawn art skin mirrors the same state classes as the SVG layers.
const catArt = document.getElementById("cat-art");
const bubble = requireElement("bubble");

let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
let reminderTimer: ReturnType<typeof setTimeout> | undefined;
let pokeTimer: ReturnType<typeof setTimeout> | undefined;

/** Mutually exclusive state classes (idle = no class at all). */
const STATE_CLASSES = ["walking", "reminder", "eat", "drink"];

export function setCatState(state: CatState): void {
  for (const el of [catLayer, catArt]) {
    if (el === null) continue;
    el.classList.remove(...STATE_CLASSES);
    if (state !== "idle") {
      el.classList.add(state);
    }
  }
}

export function setCatMood(mood: CatMood): void {
  if (catArt === null) return;
  catArt.dataset.mood = mood;
}

export function pokeCat(): void {
  for (const el of [catLayer, catArt]) {
    if (el === null) continue;
    // petting interrupts a stroll or a reminder reaction
    el.classList.remove("poke", "walking", "reminder", "eat", "drink");
  }
  // force a reflow so the one-shot squash animation restarts
  void catLayer.getBoundingClientRect();
  for (const el of [catLayer, catArt]) {
    if (el === null) continue;
    el.classList.add("poke");
  }
  clearTimeout(pokeTimer);
  // the class also selects the art-skin happy frame, so it must be dropped
  pokeTimer = setTimeout(() => {
    for (const el of [catLayer, catArt]) {
      if (el === null) continue;
      el.classList.remove("poke");
    }
  }, 500);
}

export function showBubble(text: string): void {
  bubble.textContent = text;
  bubble.classList.add("show");
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove("show"), 4200);
}

/** Which reaction plays: generic alert, or the matching food animation. */
export type ReminderAnim = "alert" | "drink" | "eat";

export function pulseReminder(kind: ReminderAnim = "alert"): void {
  setCatState(kind === "alert" ? "reminder" : kind);
  clearTimeout(reminderTimer);
  // eating/drinking gets a longer window so the loop reads
  reminderTimer = setTimeout(() => setCatState("idle"), kind === "alert" ? 1300 : 2800);
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
