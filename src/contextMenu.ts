import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { CatMood } from "./types";

export interface MenuReminder {
  id: string;
  emoji: string;
  label: string;
  enabled: boolean;
}

export interface MenuState {
  reminders: MenuReminder[];
  mood: CatMood;
}

export type MenuAction = `mood-${CatMood}` | `reminder-${string}`;

export const MENU_EVENT = "cartner:menu";

function isMenuAction(value: string): value is MenuAction {
  return value.startsWith("mood-") || value.startsWith("reminder-");
}

/**
 * Right-click opens the designed popup at the cursor (Rust side), so it can
 * extend beyond the small cat window instead of covering the cat. The settings
 * stay here in the webview: Rust only echoes the list and reports picks.
 */
export function initContextMenu(
  onOpen: () => MenuState,
  onAction: (action: MenuAction) => void,
): void {
  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const state = onOpen();
    void invoke("open_cat_menu", { menu: state }).catch((error) =>
      console.warn("mochi: could not open the menu", error),
    );
  });

  void listen<string>(MENU_EVENT, (event) => {
    if (isMenuAction(event.payload)) onAction(event.payload);
  }).catch((error) => console.warn("mochi: could not listen for menu clicks", error));
}
