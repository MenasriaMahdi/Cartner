import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { pulseReminder, showBubble } from "./cat";
import type { AppSettings, RecurringReminder } from "./types";

interface ScheduleEntry {
  intervalMinutes: number;
  nextAt: number;
}

const MINUTE = 60_000;

/**
 * One timer for the whole list instead of one per reminder: only the reminder
 * that is due first is armed, and firing it re-arms the next one. Nothing
 * polls, so an idle list costs no CPU.
 */
let timer: ReturnType<typeof setTimeout> | undefined;
let current: AppSettings | null = null;
const schedule = new Map<string, ScheduleEntry>();

/** The default two keep their food animations; custom ones get the alert. */
function animationFor(reminder: RecurringReminder): "alert" | "drink" | "eat" {
  if (reminder.id === "drink") return "drink";
  if (reminder.id === "eat") return "eat";
  return "alert";
}

/**
 * Applies the whole reminder list. Reminders whose interval and enabled state
 * did not change keep their countdown, so toggling one thing never resets the
 * others (and moving the cat never resets anything at all).
 */
export function applyReminderSettings(settings: AppSettings): void {
  current = settings;
  const now = Date.now();
  const ids = new Set(settings.reminders.map((reminder) => reminder.id));
  for (const id of [...schedule.keys()]) {
    if (!ids.has(id)) schedule.delete(id);
  }
  for (const reminder of settings.reminders) {
    if (!reminder.enabled) {
      schedule.delete(reminder.id);
      continue;
    }
    const existing = schedule.get(reminder.id);
    if (existing === undefined || existing.intervalMinutes !== reminder.intervalMinutes) {
      schedule.set(reminder.id, {
        intervalMinutes: reminder.intervalMinutes,
        nextAt: now + reminder.intervalMinutes * MINUTE,
      });
    }
  }
  arm(now);
}

function arm(now: number): void {
  clearTimeout(timer);
  timer = undefined;
  let first: { id: string; nextAt: number } | null = null;
  for (const [id, entry] of schedule) {
    if (first === null || entry.nextAt < first.nextAt) first = { id, nextAt: entry.nextAt };
  }
  if (first === null) return;
  const delay = Math.max(0, first.nextAt - now);
  timer = setTimeout(() => {
    void fire(first.id);
  }, delay);
}

async function fire(id: string): Promise<void> {
  const settings = current;
  const entry = schedule.get(id);
  if (settings === null || entry === undefined) return;
  const reminder = settings.reminders.find((candidate) => candidate.id === id);
  if (reminder === undefined || !reminder.enabled) {
    schedule.delete(id);
    arm(Date.now());
    return;
  }

  showBubble(`🐱 ${reminder.label}`);
  pulseReminder(animationFor(reminder));
  await notify(reminder);

  // Re-arm from the moment it actually fired, so a slow notification can
  // never shorten the next interval. The entry object lives in the map, so
  // this also updates what arm() reads below.
  entry.nextAt = Date.now() + entry.intervalMinutes * MINUTE;
  arm(Date.now());
}

async function notify(reminder: RecurringReminder): Promise<void> {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (granted) {
      sendNotification({
        title: `Cartner says: ${reminder.label}`,
        body: `🐱 ${reminder.label}`,
      });
    }
  } catch (error) {
    // the speech bubble already covers this; native notification is a bonus
    console.warn("cartner: native notification unavailable", error);
  }
}
