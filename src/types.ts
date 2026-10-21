export type CatState = "idle" | "walking" | "reminder";

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
}

export const REMINDER_MINUTES_MIN = 5;
export const REMINDER_MINUTES_MAX = 720;
