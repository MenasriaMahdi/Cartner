import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { CatMood } from "./types";

export interface MenuState {
  drink: boolean;
  eat: boolean;
  mood: CatMood;
}

export type MenuAction = "drink" | "eat" | `mood-${CatMood}`;

export const MENU_EVENT = "cartner:menu";

const MOOD_ACTIONS: readonly string[] = [
  "mood-normal",
  "mood-happy",
  "mood-sleepy",
  "mood-grumpy",
  "mood-sad",
];

function isMenuAction(value: string): value is MenuAction {
  return value === "drink" || value === "eat" || MOOD_ACTIONS.includes(value);
}

/**
 * Right-click opens a real OS menu at the cursor (Rust side), so it can extend
 * beyond the small cat window instead of covering the cat. The settings stay
 * here in the webview: Rust only reports which item was picked.
 */
export function initContextMenu(
  onOpen: () => MenuState,
  onAction: (action: MenuAction) => void,
): void {
  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const state = onOpen();
    void invoke("open_cat_menu", {
      drink: state.drink,
      eat: state.eat,
      mood: state.mood,
    }).catch((error) => console.warn("mochi: could not open the menu", error));
  });

  void listen<string>(MENU_EVENT, (event) => {
    if (isMenuAction(event.payload)) onAction(event.payload);
  }).catch((error) => console.warn("mochi: could not listen for menu clicks", error));
}
