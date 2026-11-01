import "./report";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { requireElement } from "./dom";
import {
  loadSettings,
  newReminderId,
  sanitizeInterval,
  sanitizeSettings,
  saveSettings,
  SETTINGS_CHANGED_EVENT,
} from "./state/settings";
import {
  type AppSettings,
  type RecurringReminder,
  MAX_REMINDER_LABEL,
  MAX_REMINDERS,
  REMINDER_EMOJIS,
  REMINDER_MINUTES_MAX,
  REMINDER_MINUTES_MIN,
} from "./types";

function requireInput(id: string): HTMLInputElement {
  const el = requireElement(id);
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`cartner: #${id} is not an input`);
  }
  return el;
}

const listEl = requireElement("reminder-list");
const addButton = requireElement("add-reminder") as HTMLButtonElement;
const pixelCat = requireInput("pixel-cat");

let dirty = false; // unsaved edits: outside settings changes must not wipe them

function emojiSelect(value: string): HTMLSelectElement {
  const select = document.createElement("select");
  select.className = "emoji";
  select.title = "Icon";
  for (const emoji of REMINDER_EMOJIS) {
    const option = document.createElement("option");
    option.value = emoji;
    option.textContent = emoji;
    select.append(option);
  }
  select.value = value;
  if (select.value !== value) select.value = "⏰";
  return select;
}

/** A fallback for emoji arriving from storage that are no longer offered. */
function storedEmoji(reminder: RecurringReminder): string {
  return REMINDER_EMOJIS.includes(reminder.emoji) ? reminder.emoji : "⏰";
}

function markDirty(): void {
  dirty = true;
}

function updateAddState(): void {
  addButton.disabled = listEl.children.length >= MAX_REMINDERS;
}

function reminderRow(reminder: RecurringReminder): HTMLElement {
  const row = document.createElement("div");
  row.className = "reminder-item";
  row.dataset["id"] = reminder.id;

  const emoji = emojiSelect(storedEmoji(reminder));
  const label = document.createElement("input");
  label.type = "text";
  label.className = "label";
  label.maxLength = MAX_REMINDER_LABEL;
  label.value = reminder.label;
  label.placeholder = "Reminder";
  label.title = "What Cartner should nudge you about";

  const interval = document.createElement("input");
  interval.type = "number";
  interval.className = "interval";
  interval.min = String(REMINDER_MINUTES_MIN);
  interval.max = String(REMINDER_MINUTES_MAX);
  interval.step = "5";
  interval.value = String(reminder.intervalMinutes);
  interval.title = "Minutes between nudges";

  const enabled = document.createElement("input");
  enabled.type = "checkbox";
  enabled.className = "enabled";
  enabled.checked = reminder.enabled;
  enabled.title = "On / off";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove";
  remove.title = "Remove reminder";
  remove.textContent = "✕";
  remove.addEventListener("click", () => {
    dirty = true;
    row.remove();
    updateAddState();
  });

  emoji.addEventListener("change", markDirty);
  label.addEventListener("input", markDirty);
  interval.addEventListener("input", markDirty);
  enabled.addEventListener("change", markDirty);

  row.append(emoji, label, interval, enabled, remove);
  return row;
}

function reminderJson(reminders: readonly RecurringReminder[]): string {
  return JSON.stringify(reminders);
}

function renderList(reminders: readonly RecurringReminder[]): void {
  listEl.replaceChildren(...reminders.map(reminderRow));
  updateAddState();
}

function readList(): RecurringReminder[] {
  return [...listEl.querySelectorAll<HTMLElement>(".reminder-item")].map((row) => {
    const emoji = row.querySelector<HTMLSelectElement>("select.emoji");
    const label = row.querySelector<HTMLInputElement>("input.label");
    const interval = row.querySelector<HTMLInputElement>("input.interval");
    const enabled = row.querySelector<HTMLInputElement>("input.enabled");
    const text = (label?.value ?? "").trim().slice(0, MAX_REMINDER_LABEL);
    return {
      id: row.dataset["id"] ?? newReminderId(),
      emoji: emoji?.value ?? "⏰",
      label: text === "" ? "Reminder" : text,
      enabled: enabled?.checked ?? true,
      intervalMinutes: sanitizeInterval(interval?.value, 60),
    };
  });
}

function syncForm(s: AppSettings): void {
  pixelCat.checked = s.pixelCat;
  renderList(s.reminders);
}

const initial = loadSettings();
syncForm(initial);

void listen(SETTINGS_CHANGED_EVENT, (event) => {
  const s = sanitizeSettings(event.payload);
  pixelCat.checked = s.pixelCat;
  // Only rebuild when the reminder list really changed (not on every cat
  // position save), and never while the user has unsaved edits.
  if (!dirty && reminderJson(s.reminders) !== reminderJson(readList())) {
    renderList(s.reminders);
  }
}).catch((error) => console.warn("cartner: could not listen for settings", error));

addButton.addEventListener("click", () => {
  if (listEl.children.length >= MAX_REMINDERS) return;
  dirty = true;
  const row = reminderRow({
    id: newReminderId(),
    emoji: "⏰",
    label: "New reminder",
    enabled: true,
    intervalMinutes: 60,
  });
  listEl.append(row);
  updateAddState();
  const label = row.querySelector<HTMLInputElement>("input.label");
  label?.focus();
  label?.select();
});

async function saveAndClose(): Promise<void> {
  const base = loadSettings();
  const next: AppSettings = {
    ...base,
    reminders: readList(),
    pixelCat: pixelCat.checked,
  };
  dirty = false;
  saveSettings(next);
  try {
    await getCurrentWindow().close(); // Rust turns this into a hide
  } catch (error) {
    console.warn("cartner: could not close settings window", error);
  }
}

requireElement("save").addEventListener("click", () => void saveAndClose());
requireElement("close").addEventListener("click", () => {
  void getCurrentWindow().close().catch((error) =>
    console.warn("cartner: could not close settings window", error),
  );
});
