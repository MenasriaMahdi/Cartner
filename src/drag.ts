import { getCurrentWindow } from "@tauri-apps/api/window";
import { requireElement } from "./dom";
import { pokeCat } from "./cat";
import type { CatPosition } from "./types";

/**
 * Left mouse drag moves the cat window natively (cheap, no per-frame JS).
 * The debounced `tauri://moved` events persist the final position.
 */
export function initDragging(onPositionSettled: (pos: CatPosition) => void): void {
  const cat = requireElement("cat");
  const wnd = getCurrentWindow();

  cat.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    pokeCat();
    void wnd.startDragging().catch((error) =>
      console.warn("mochi: drag failed", error),
    );
  });

  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  void wnd
    .onMoved(({ payload }) => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => onPositionSettled({ x: payload.x, y: payload.y }), 450);
    })
    .catch((error) => console.warn("mochi: could not listen for moves", error));
}
