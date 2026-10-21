import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { pulseReminder, showBubble } from "./cat";
import type { AppSettings, ReminderSettings } from "./types";

export type ReminderKind = "drink" | "eat";

const MESSAGES: Record<ReminderKind, string> = {
  drink: "🐱 Time to drink some water!",
  eat: "🐱 Don't forget to eat!",
};

const TITLES: Record<ReminderKind, string> = {
  drink: "Mochi says: hydrate!",
  eat: "Mochi says: snack time!",
};

let drinkTimer: ReturnType<typeof setTimeout> | undefined;
let eatTimer: ReturnType<typeof setTimeout> | undefined;
let lastScheduled: AppSettings | null = null;
let currentSettings: AppSettings;

function reminderOf(kind: ReminderKind, s: AppSettings): ReminderSettings {
  return kind === "drink" ? s.drinkReminder : s.eatReminder;
}

function scheduleKind(kind: ReminderKind, s: AppSettings): void {
  const r = reminderOf(kind, s);
  if (!r.enabled) return;
  const timer = setTimeout(() => {
    void fireReminder(kind);
  }, r.intervalMinutes * 60_000);
  if (kind === "drink") drinkTimer = timer;
  else eatTimer = timer;
}

function scheduleAll(s: AppSettings): void {
  clearTimeout(drinkTimer);
  clearTimeout(eatTimer);
  scheduleKind("drink", s);
  scheduleKind("eat", s);
  lastScheduled = s;
}

/**
 * Re-applies reminder settings, rescheduling only when a reminder setting
 * actually changed (saving the cat position must not reset running timers).
 */
export function applyReminderSettings(s: AppSettings): void {
  currentSettings = s;
  const previous = lastScheduled;
  if (
    previous !== null &&
    previous.drinkReminder.enabled === s.drinkReminder.enabled &&
    previous.drinkReminder.intervalMinutes === s.drinkReminder.intervalMinutes &&
    previous.eatReminder.enabled === s.eatReminder.enabled &&
    previous.eatReminder.intervalMinutes === s.eatReminder.intervalMinutes
  ) {
    lastScheduled = s;
    return;
  }
  scheduleAll(s);
}

async function fireReminder(kind: ReminderKind): Promise<void> {
  const message = MESSAGES[kind];
  showBubble(message);
  pulseReminder();
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (granted) sendNotification({ title: TITLES[kind], body: message });
  } catch (error) {
    // the speech bubble already covers this; native notification is a bonus
    console.warn("mochi: native notification unavailable", error);
  }
  scheduleKind(kind, currentSettings);
}
