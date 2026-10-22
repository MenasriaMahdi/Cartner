import { requireElement } from "./dom";
import type { CatMood } from "./types";

export interface MenuActions {
  onMenuOpen: () => void;
  onToggleDrink: () => void;
  onToggleEat: () => void;
  onSetMood: (mood: CatMood) => void;
  onOpenSettings: () => void;
  onOpenTasks: () => void;
  onExit: () => void;
}

const MOOD_LABELS: Record<CatMood, string> = {
  normal: "Normal",
  happy: "Happy",
  sleepy: "Sleepy",
  grumpy: "Grumpy",
  sad: "Sad",
};

const MOODS: readonly string[] = ["normal", "happy", "sleepy", "grumpy", "sad"];

/** Tiny in-window context menu (right click) with a two-page mood picker. */
export function initContextMenu(actions: MenuActions): void {
  const menu = requireElement("menu");
  const mainPage = requireElement("menu-page-main");
  const moodPage = requireElement("menu-page-mood");
  let anchorX = 0;
  let anchorY = 0;

  function hide(): void {
    menu.hidden = true;
  }

  /** Clamps the menu inside the cat window (it is only 176px wide). */
  function place(): void {
    const rect = menu.getBoundingClientRect();
    const left = Math.min(
      Math.max(4, anchorX),
      Math.max(4, window.innerWidth - rect.width - 4),
    );
    const top = Math.min(
      Math.max(4, anchorY),
      Math.max(4, window.innerHeight - rect.height - 4),
    );
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function showMainPage(): void {
    mainPage.hidden = false;
    moodPage.hidden = true;
  }

  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    actions.onMenuOpen();
    showMainPage();
    menu.hidden = false;
    anchorX = event.clientX;
    anchorY = event.clientY;
    place();
  });

  document.addEventListener("mousedown", (event) => {
    if (!menu.hidden && event.target instanceof Node && !menu.contains(event.target)) {
      hide();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });

  window.addEventListener("blur", hide);

  requireElement("menu-drink").addEventListener("click", () => {
    hide();
    actions.onToggleDrink();
  });
  requireElement("menu-eat").addEventListener("click", () => {
    hide();
    actions.onToggleEat();
  });
  requireElement("menu-mood").addEventListener("click", () => {
    mainPage.hidden = true;
    moodPage.hidden = false;
    place();
  });
  requireElement("menu-mood-back").addEventListener("click", () => {
    showMainPage();
    place();
  });
  menu.querySelectorAll("button[data-mood]").forEach((button) => {
    button.addEventListener("click", () => {
      const mood = button.getAttribute("data-mood");
      if (mood !== null && MOODS.includes(mood)) {
        hide();
        actions.onSetMood(mood as CatMood);
      }
    });
  });
  requireElement("menu-tasks").addEventListener("click", () => {
    hide();
    actions.onOpenTasks();
  });
  requireElement("menu-settings").addEventListener("click", () => {
    hide();
    actions.onOpenSettings();
  });
  requireElement("menu-exit").addEventListener("click", () => {
    hide();
    actions.onExit();
  });
}

export function setMenuChecks(
  drinkEnabled: boolean,
  eatEnabled: boolean,
  mood: CatMood,
): void {
  requireElement("menu-drink-check").textContent = drinkEnabled ? "✓" : "";
  requireElement("menu-eat-check").textContent = eatEnabled ? "✓" : "";
  requireElement("menu-mood-value").textContent = MOOD_LABELS[mood];
  document.querySelectorAll("button[data-mood]").forEach((button) => {
    const check = button.querySelector(".check");
    if (check !== null) {
      check.textContent = button.getAttribute("data-mood") === mood ? "✓" : "";
    }
  });
}
