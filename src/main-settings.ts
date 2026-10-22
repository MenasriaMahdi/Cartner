import "./report";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { requireElement } from "./dom";
import {
  loadSettings,
  sanitizeInterval,
  sanitizeSettings,
  saveSettings,
  SETTINGS_CHANGED_EVENT,
} from "./state/settings";
import type { AppSettings } from "./types";

function requireInput(id: string): HTMLInputElement {
  const el = requireElement(id);
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`mochi: #${id} is not an input`);
  }
  return el;
}

const drinkEnabled = requireInput("drink-enabled");
const drinkInterval = requireInput("drink-interval");
const eatEnabled = requireInput("eat-enabled");
const eatInterval = requireInput("eat-interval");
const pixelCat = requireInput("pixel-cat");

function syncForm(s: AppSettings): void {
  drinkEnabled.checked = s.drinkReminder.enabled;
  drinkInterval.value = String(s.drinkReminder.intervalMinutes);
  eatEnabled.checked = s.eatReminder.enabled;
  eatInterval.value = String(s.eatReminder.intervalMinutes);
  pixelCat.checked = s.pixelCat;
}

syncForm(loadSettings());

void listen(SETTINGS_CHANGED_EVENT, (event) => {
  syncForm(sanitizeSettings(event.payload));
}).catch((error) => console.warn("mochi: could not listen for settings", error));

async function saveAndClose(): Promise<void> {
  const base = loadSettings();
  const next: AppSettings = {
    ...base,
    drinkReminder: {
      enabled: drinkEnabled.checked,
      intervalMinutes: sanitizeInterval(drinkInterval.value, base.drinkReminder.intervalMinutes),
    },
    eatReminder: {
      enabled: eatEnabled.checked,
      intervalMinutes: sanitizeInterval(eatInterval.value, base.eatReminder.intervalMinutes),
    },
    pixelCat: pixelCat.checked,
  };
  saveSettings(next);
  try {
    await getCurrentWindow().close(); // Rust turns this into a hide
  } catch (error) {
    console.warn("mochi: could not close settings window", error);
  }
}

requireElement("save").addEventListener("click", () => void saveAndClose());
requireElement("close").addEventListener("click", () => {
  void getCurrentWindow().close().catch((error) =>
    console.warn("mochi: could not close settings window", error),
  );
});
