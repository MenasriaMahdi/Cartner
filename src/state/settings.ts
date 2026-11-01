import { emit } from "@tauri-apps/api/event";
import {
  type AppSettings,
  type CatMood,
  type RecurringReminder,
  MAX_REMINDER_LABEL,
  MAX_REMINDERS,
  REMINDER_EMOJIS,
  REMINDER_MINUTES_MAX,
  REMINDER_MINUTES_MIN,
} from "../types";

const STORAGE_KEY = "cartner.settings.v1";
export const SETTINGS_CHANGED_EVENT = "cartner:settings-changed";

/** The two reminders Cartner has always shipped with. */
export const DEFAULT_REMINDERS: readonly RecurringReminder[] = [
  { id: "drink", emoji: "💧", label: "Drink some water", enabled: true, intervalMinutes: 60 },
  { id: "eat", emoji: "🍎", label: "Eat something", enabled: true, intervalMinutes: 240 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  reminders: cloneReminders(DEFAULT_REMINDERS),
  catPosition: null,
  pixelCat: false,
  catMood: "normal",
};

function cloneReminders(reminders: readonly RecurringReminder[]): RecurringReminder[] {
  return reminders.map((reminder) => ({ ...reminder }));
}

function cloneDefaults(): AppSettings {
  return { ...DEFAULT_SETTINGS, reminders: cloneReminders(DEFAULT_REMINDERS) };
}

export function sanitizeInterval(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(REMINDER_MINUTES_MAX, Math.max(REMINDER_MINUTES_MIN, Math.round(n)));
}

export function newReminderId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function sanitizeEmoji(raw: unknown): string {
  return typeof raw === "string" && REMINDER_EMOJIS.includes(raw) ? raw : "⏰";
}

function sanitizeLabel(raw: unknown): string {
  const text = typeof raw === "string" ? raw.trim().slice(0, MAX_REMINDER_LABEL) : "";
  return text === "" ? "Reminder" : text;
}

function sanitizeReminder(
  raw: unknown,
  fallback: RecurringReminder,
  seen: Set<string>,
): RecurringReminder {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  let id = typeof r["id"] === "string" && r["id"].trim() !== "" ? r["id"].trim() : fallback.id;
  if (seen.has(id)) id = newReminderId();
  seen.add(id);
  return {
    id,
    emoji: sanitizeEmoji(r["emoji"] ?? fallback.emoji),
    label: sanitizeLabel(r["label"] ?? fallback.label),
    enabled: typeof r["enabled"] === "boolean" ? r["enabled"] : fallback.enabled,
    intervalMinutes: sanitizeInterval(r["intervalMinutes"], fallback.intervalMinutes),
  };
}

/** Settings written before reminders were a list: two fixed drink/eat entries. */
function legacyReminders(o: Record<string, unknown>): RecurringReminder[] {
  return DEFAULT_REMINDERS.map((fallback) => {
    const key = fallback.id === "drink" ? "drinkReminder" : "eatReminder";
    const r = (typeof o[key] === "object" && o[key] !== null ? o[key] : {}) as Record<
      string,
      unknown
    >;
    return {
      ...fallback,
      enabled: typeof r["enabled"] === "boolean" ? r["enabled"] : fallback.enabled,
      intervalMinutes: sanitizeInterval(r["intervalMinutes"], fallback.intervalMinutes),
    };
  });
}

function sanitizeReminders(raw: unknown, legacy: Record<string, unknown>): RecurringReminder[] {
  if (!Array.isArray(raw)) return legacyReminders(legacy);
  const seen = new Set<string>();
  const reminders: RecurringReminder[] = [];
  for (const [index, entry] of raw.slice(0, MAX_REMINDERS).entries()) {
    if (typeof entry !== "object" || entry === null) continue;
    const fallback: RecurringReminder = {
      id: `r${index}`,
      emoji: "⏰",
      label: "Reminder",
      enabled: true,
      intervalMinutes: 60,
    };
    reminders.push(sanitizeReminder(entry, fallback, seen));
  }
  return reminders;
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
    reminders: sanitizeReminders(o["reminders"], o),
    catPosition,
    pixelCat: typeof o["pixelCat"] === "boolean" ? o["pixelCat"] : DEFAULT_SETTINGS.pixelCat,
    catMood: sanitizeMood(o["catMood"]),
  };
}

/**
 * Marks that stored settings were rescued from the pixel-skin experiments:
 * the classic cat is forced back on exactly once, then is never overruled.
 */
const PIXEL_RESET_KEY = "cartner.pixel-reset.v1";

/** Settings written before the Cartner rename; read once, then re-saved. */
const LEGACY_SETTINGS_KEY = "mochi.settings.v1";
const LEGACY_PIXEL_RESET_KEY = "mochi.pixel-reset.v1";

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (raw === null) return cloneDefaults();
    const settings = sanitizeSettings(JSON.parse(raw));
    const pixelReset =
      localStorage.getItem(PIXEL_RESET_KEY) ?? localStorage.getItem(LEGACY_PIXEL_RESET_KEY);
    if (localStorage.getItem(STORAGE_KEY) === null) {
      // First launch on the new key: re-save so the rename fully migrates.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
    if (pixelReset === null) {
      const restored = { ...settings, pixelCat: DEFAULT_SETTINGS.pixelCat };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      localStorage.setItem(PIXEL_RESET_KEY, "1");
      return restored;
    }
    return settings;
  } catch (error) {
    console.warn("cartner: failed to load settings, using defaults", error);
    return cloneDefaults();
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
    console.warn("cartner: failed to persist settings", error);
  }
  void emit(SETTINGS_CHANGED_EVENT, settings).catch((error) =>
    console.warn("cartner: failed to broadcast settings", error),
  );
  return settings;
}
