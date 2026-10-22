import { emit } from "@tauri-apps/api/event";
import {
  type AppSettings,
  type CatMood,
  type ReminderSettings,
  REMINDER_MINUTES_MAX,
  REMINDER_MINUTES_MIN,
} from "../types";

const STORAGE_KEY = "mochi.settings.v1";
export const SETTINGS_CHANGED_EVENT = "mochi:settings-changed";

export const DEFAULT_SETTINGS: AppSettings = {
  drinkReminder: { enabled: true, intervalMinutes: 60 },
  eatReminder: { enabled: true, intervalMinutes: 240 },
  catPosition: null,
  pixelCat: false,
  catMood: "normal",
};

export function sanitizeInterval(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(REMINDER_MINUTES_MAX, Math.max(REMINDER_MINUTES_MIN, Math.round(n)));
}

function sanitizeReminder(raw: unknown, fallback: ReminderSettings): ReminderSettings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    enabled: typeof r["enabled"] === "boolean" ? r["enabled"] : fallback.enabled,
    intervalMinutes: sanitizeInterval(r["intervalMinutes"], fallback.intervalMinutes),
  };
}

function sanitizeMood(raw: unknown): CatMood {
  return raw === "happy" || raw === "sleepy" || raw === "grumpy" || raw === "sad"
    ? raw
    : "normal";
}

export function sanitizeSettings(raw: unknown): AppSettings {
  const o = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  let catPosition = null;
  const pos = o["catPosition"] as Record<string, unknown> | null;
  if (
    typeof pos === "object" &&
    pos !== null &&
    typeof pos["x"] === "number" &&
    Number.isFinite(pos["x"]) &&
    typeof pos["y"] === "number" &&
    Number.isFinite(pos["y"])
  ) {
    catPosition = { x: pos["x"], y: pos["y"] };
  }
  return {
    drinkReminder: sanitizeReminder(o["drinkReminder"], DEFAULT_SETTINGS.drinkReminder),
    eatReminder: sanitizeReminder(o["eatReminder"], DEFAULT_SETTINGS.eatReminder),
    catPosition,
    pixelCat: typeof o["pixelCat"] === "boolean" ? o["pixelCat"] : DEFAULT_SETTINGS.pixelCat,
    catMood: sanitizeMood(o["catMood"]),
  };
}

/**
 * Marks that stored settings were rescued from the pixel-skin experiments:
 * the classic cat is forced back on exactly once, then is never overruled.
 */
const PIXEL_RESET_KEY = "mochi.pixel-reset.v1";

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { ...DEFAULT_SETTINGS };
    const settings = sanitizeSettings(JSON.parse(raw));
    if (localStorage.getItem(PIXEL_RESET_KEY) === null) {
      const restored = { ...settings, pixelCat: DEFAULT_SETTINGS.pixelCat };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      localStorage.setItem(PIXEL_RESET_KEY, "1");
      return restored;
    }
    return settings;
  } catch (error) {
    console.warn("mochi: failed to load settings, using defaults", error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persists settings and broadcasts the change to every window.
 * Listeners never re-save, so there is no event loop.
 */
export function saveSettings(settings: AppSettings): AppSettings {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("mochi: failed to persist settings", error);
  }
  void emit(SETTINGS_CHANGED_EVENT, settings).catch((error) =>
    console.warn("mochi: failed to broadcast settings", error),
  );
  return settings;
}
