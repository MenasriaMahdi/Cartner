import { listen } from "@tauri-apps/api/event";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { noteActivity, setCatMood, startIdleCycle } from "./cat";
import { initContextMenu } from "./contextMenu";
import { initDragging } from "./drag";
import { applyReminderSettings } from "./reminders";
import { initializeTaskReminders } from "./taskReminders";
import {
  loadSettings,
  sanitizeSettings,
  saveSettings,
  SETTINGS_CHANGED_EVENT,
} from "./state/settings";
import type { AppSettings, CatMood } from "./types";

const wnd = getCurrentWindow();
let settings: AppSettings = loadSettings();

// Restore the last known cat position (missing on the very first run).
const savedPosition = settings.catPosition;
if (savedPosition !== null) {
  void wnd
    .setPosition(new PhysicalPosition(Math.round(savedPosition.x), Math.round(savedPosition.y)))
    .catch((error) => console.warn("mochi: could not restore cat position", error));
}

function applySkin(s: AppSettings): void {
  document.body.classList.toggle("pixel", s.pixelCat);
  setCatMood(s.catMood);
}

function toggleReminder(kind: "drink" | "eat"): void {
  const next: AppSettings = {
    ...settings,
    drinkReminder: { ...settings.drinkReminder },
    eatReminder: { ...settings.eatReminder },
  };
  if (kind === "drink") next.drinkReminder.enabled = !next.drinkReminder.enabled;
  else next.eatReminder.enabled = !next.eatReminder.enabled;
  saveSettings(next); // the settings listener applies it everywhere
}

initContextMenu(
  () => {
    noteActivity();
    return {
      drink: settings.drinkReminder.enabled,
      eat: settings.eatReminder.enabled,
      mood: settings.catMood,
    };
  },
  (action) => {
    noteActivity();
    if (action === "drink" || action === "eat") toggleReminder(action);
    else saveSettings({ ...settings, catMood: action.slice(5) as CatMood });
  },
);

initDragging((position) => {
  noteActivity();
  const saved = settings.catPosition;
  if (saved !== null && saved.x === position.x && saved.y === position.y) return;
  saveSettings({ ...settings, catPosition: position });
});

applyReminderSettings(settings);
initializeTaskReminders();
startIdleCycle();
applySkin(settings);

void listen(SETTINGS_CHANGED_EVENT, (event) => {
  settings = sanitizeSettings(event.payload);
  applyReminderSettings(settings);
  applySkin(settings);
}).catch((error) => console.warn("mochi: could not listen for settings", error));
