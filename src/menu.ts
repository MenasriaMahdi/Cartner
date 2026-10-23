import "./report";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { requireElement } from "./dom";

interface MenuReminder {
  id: string;
  emoji: string;
  label: string;
  enabled: boolean;
}

interface MenuState {
  reminders: MenuReminder[];
  mood: string;
}

const MOOD_LABELS: Record<string, string> = {
  normal: "Normal",
  happy: "Happy",
  sleepy: "Sleepy",
  grumpy: "Grumpy",
  sad: "Sad",
};

function moodLabel(mood: string): string {
  return MOOD_LABELS[mood] ?? "Normal";
}

/** "All 2 on" / "1 of 3 on" / "None" — the main page is one row now. */
function summary(reminders: MenuReminder[]): string {
  if (reminders.length === 0) return "None";
  const on = reminders.filter((reminder) => reminder.enabled).length;
  if (on === reminders.length) return `All ${on} on`;
  return `${on} of ${reminders.length} on`;
}

function reminderRow(reminder: MenuReminder): HTMLButtonElement {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "row";
  row.dataset["pick"] = `reminder-${reminder.id}`;

  const icon = document.createElement("span");
  icon.className = "ico";
  icon.textContent = reminder.emoji;

  const label = document.createElement("span");
  label.className = "lbl";
  label.textContent = reminder.label;

  const check = document.createElement("span");
  check.className = "check";
  check.textContent = reminder.enabled ? "✓" : "";

  row.append(icon, label, check);
  return row;
}

function renderReminders(reminders: MenuReminder[]): void {
  const list = requireElement("reminder-list");
  if (reminders.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No reminders yet — add some in Settings.";
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(...reminders.map(reminderRow));
}

/** Fills in the list, the summary and the current mood from Rust's snapshot. */
function applyState(state: MenuState): void {
  const reminders = Array.isArray(state.reminders) ? state.reminders : [];
  renderReminders(reminders);
  requireElement("reminders-value").textContent = summary(reminders);
  requireElement("mood-value").textContent = moodLabel(state.mood);
  document.querySelectorAll<HTMLElement>("[data-check]").forEach((element) => {
    element.textContent = element.dataset["check"] === state.mood ? "✓" : "";
  });
}

function showPage(page: "main" | "reminders" | "mood"): void {
  requireElement("page-main").hidden = page !== "main";
  requireElement("page-reminders").hidden = page !== "reminders";
  requireElement("page-mood").hidden = page !== "mood";
}

function pick(action: string): void {
  void invoke("pick_menu", { action }).catch((error) =>
    console.warn("mochi: menu pick failed", error),
  );
}

function close(): void {
  void invoke("close_cat_menu").catch((error) =>
    console.warn("mochi: could not close the menu", error),
  );
}

function init(): void {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const row = target.closest<HTMLElement>("[data-pick]");
    if (row !== null) {
      const action = row.dataset["pick"];
      if (action !== undefined) pick(action);
      return;
    }
    if (target.closest("#reminders-open") !== null) {
      showPage("reminders");
      return;
    }
    if (target.closest("#mood-open") !== null) {
      showPage("mood");
      return;
    }
    if (target.closest("#reminders-back") !== null || target.closest("#mood-back") !== null) {
      showPage("main");
    }
  });

  // The popup is the menu: no browser context menu inside it.
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  // Reopening the warm popup: refresh the list and start on the main page.
  void listen<MenuState>("cartner:menu-opened", (event) => {
    applyState(event.payload);
    showPage("main");
  });

  void invoke<MenuState>("menu_state")
    .then((state) => {
      applyState(state);
      document.body.classList.add("ready");
    })
    .catch((error) => {
      console.warn("mochi: could not load menu state", error);
      document.body.classList.add("ready");
    });
}

init();
