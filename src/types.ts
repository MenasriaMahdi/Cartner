export type CatState = "idle" | "walking" | "reminder" | "eat" | "drink";

/** Persistent mood picked from the right-click menu. */
export type CatMood = "normal" | "happy" | "sleepy" | "grumpy" | "sad";

/** A named reminder that repeats every N minutes while it is switched on. */
export interface RecurringReminder {
  id: string;
  /** One of REMINDER_EMOJIS. */
  emoji: string;
  label: string;
  enabled: boolean;
  intervalMinutes: number;
}

export interface CatPosition {
  x: number;
  y: number;
}

export interface AppSettings {
  reminders: RecurringReminder[];
  catPosition: CatPosition | null;
  /** Hand-drawn pixel-art skin instead of the classic SVG cat. */
  pixelCat: boolean;
  catMood: CatMood;
}

export interface Task {
  id: string;
  title: string;
  /** Unix ms when the task is due; undefined = assigned without a time. */
  dueAt?: number;
  done: boolean;
  createdAt: number;
  /** Unix ms when the reminder already fired; prevents refiring. */
  remindedAt?: number;
}

export const MAX_TASKS = 100;

export const REMINDER_MINUTES_MIN = 5;
export const REMINDER_MINUTES_MAX = 720;
export const MAX_REMINDERS = 8;
export const MAX_REMINDER_LABEL = 32;

/** Icon picker in Settings; also the allow-list for what may be stored. */
export const REMINDER_EMOJIS: readonly string[] = [
  "💧",
  "🍎",
  "🥕",
  "☕",
  "💊",
  "🧘",
  "🚶",
  "📚",
  "⏰",
  "🌿",
];
