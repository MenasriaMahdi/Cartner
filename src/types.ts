export type CatState = "idle" | "walking" | "reminder" | "eat" | "drink";

export interface ReminderSettings {
  enabled: boolean;
  intervalMinutes: number;
}

export interface CatPosition {
  x: number;
  y: number;
}

export interface AppSettings {
  drinkReminder: ReminderSettings;
  eatReminder: ReminderSettings;
  catPosition: CatPosition | null;
  /** Hand-drawn pixel-art skin instead of the classic SVG cat. */
  pixelCat: boolean;
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
