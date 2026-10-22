import "./report";
import { listen } from "@tauri-apps/api/event";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import {
  availableMonitors,
  getCurrentWindow,
} from "@tauri-apps/api/window";
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
import type { AppSettings, CatMood, CatPosition } from "./types";

const wnd = getCurrentWindow();
let settings: AppSettings = loadSettings();

/**
 * Restores the last position only if that spot still exists: a monitor may
 * have been unplugged or rearranged since the cat was parked there. Without
 * this the window could start life off-screen and look like a crash.
 */
async function restorePosition(saved: CatPosition): Promise<void> {
  try {
    const monitors = await availableMonitors();
    const onScreen = monitors.some(
      (monitor) =>
        saved.x >= monitor.position.x - 24 &&
        saved.y >= monitor.position.y - 24 &&
        saved.x <= monitor.position.x + monitor.size.width - 40 &&
        saved.y <= monitor.position.y + monitor.size.height - 40,
    );
    if (!onScreen) return;
    await wnd.setPosition(
      new PhysicalPosition(Math.round(saved.x), Math.round(saved.y)),
    );
  } catch (error) {
    console.warn("mochi: could not restore cat position", error);
  }
}

const savedPosition = settings.catPosition;
if (savedPosition !== null) {
  void restorePosition(savedPosition);
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
