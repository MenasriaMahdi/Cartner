import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { startIdleCycle } from "./cat";
import { initContextMenu, setMenuChecks } from "./contextMenu";
import { initDragging } from "./drag";
import { applyReminderSettings } from "./reminders";
import {
  loadSettings,
  sanitizeSettings,
  saveSettings,
  SETTINGS_CHANGED_EVENT,
} from "./state/settings";
import type { AppSettings } from "./types";

const wnd = getCurrentWindow();
let settings: AppSettings = loadSettings();

// Restore the last known cat position (missing on the very first run).
const savedPosition = settings.catPosition;
if (savedPosition !== null) {
  void wnd
    .setPosition(new PhysicalPosition(Math.round(savedPosition.x), Math.round(savedPosition.y)))
    .catch((error) => console.warn("mochi: could not restore cat position", error));
}

function refreshMenuChecks(): void {
  setMenuChecks(settings.drinkReminder.enabled, settings.eatReminder.enabled);
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

initContextMenu({
  onMenuOpen: refreshMenuChecks,
  onToggleDrink: () => toggleReminder("drink"),
  onToggleEat: () => toggleReminder("eat"),
  onOpenSettings: () => {
    void invoke("toggle_settings_window").catch((error) =>
      console.warn("mochi: could not open settings", error),
    );
  },
  onExit: () => {
    void invoke("exit_app").catch((error) =>
      console.warn("mochi: could not exit", error),
    );
  },
});

initDragging((position) => {
  const saved = settings.catPosition;
  if (saved !== null && saved.x === position.x && saved.y === position.y) return;
  saveSettings({ ...settings, catPosition: position });
});

applyReminderSettings(settings);
startIdleCycle();

void listen(SETTINGS_CHANGED_EVENT, (event) => {
  settings = sanitizeSettings(event.payload);
  refreshMenuChecks();
  applyReminderSettings(settings);
}).catch((error) => console.warn("mochi: could not listen for settings", error));
