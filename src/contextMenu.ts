import { requireElement } from "./dom";

export interface MenuActions {
  onMenuOpen: () => void;
  onToggleDrink: () => void;
  onToggleEat: () => void;
  onOpenSettings: () => void;
  onOpenTasks: () => void;
  onExit: () => void;
}

/** Tiny in-window context menu (right click). */
export function initContextMenu(actions: MenuActions): void {
  const menu = requireElement("menu");

  function hide(): void {
    menu.hidden = true;
  }

  function showAt(clientX: number, clientY: number): void {
    actions.onMenuOpen();
    menu.hidden = false;
    const rect = menu.getBoundingClientRect();
    const left = Math.min(
      Math.max(4, clientX),
      Math.max(4, window.innerWidth - rect.width - 4),
    );
    const top = Math.min(
      Math.max(4, clientY),
      Math.max(4, window.innerHeight - rect.height - 4),
    );
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    showAt(event.clientX, event.clientY);
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

export function setMenuChecks(drinkEnabled: boolean, eatEnabled: boolean): void {
  requireElement("menu-drink-check").textContent = drinkEnabled ? "✓" : "";
  requireElement("menu-eat-check").textContent = eatEnabled ? "✓" : "";
}
