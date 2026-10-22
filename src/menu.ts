import "./report";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { requireElement } from "./dom";

interface MenuState {
  drink: boolean;
  eat: boolean;
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

/** Fills in the check marks and the current mood, once, from Rust's snapshot. */
function applyState(state: MenuState): void {
  requireElement("check-drink").textContent = state.drink ? "✓" : "";
  requireElement("check-eat").textContent = state.eat ? "✓" : "";
  requireElement("mood-value").textContent = moodLabel(state.mood);
  document.querySelectorAll<HTMLElement>("[data-check]").forEach((element) => {
    element.textContent = element.dataset["check"] === state.mood ? "✓" : "";
  });
}

function showPage(page: "main" | "mood"): void {
  requireElement("page-main").hidden = page !== "main";
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
    if (target.closest("#mood-open") !== null) {
      showPage("mood");
      return;
    }
    if (target.closest("#mood-back") !== null) {
      showPage("main");
    }
  });

  // The popup is the menu: no browser context menu inside it.
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  // Reopening the warm popup: refresh checks and start on the main page.
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
