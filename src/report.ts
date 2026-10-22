import { invoke } from "@tauri-apps/api/core";

/**
 * Forwards uncaught errors to the Rust console, where they land in the app log
 * instead of the invisible web devtools.
 *
 * Imported first by every page so the listeners are installed before the rest
 * of that page's module graph runs. Kept inline-free so the app can run under a
 * strict script-src CSP.
 */
function report(kind: string, detail: string): void {
  void invoke("log_line", { message: `${kind}: ${detail}` }).catch(() => undefined);
}

window.addEventListener("error", (event) => {
  report("js-error", `${event.message} @ ${event.filename || "?"}:${event.lineno}`);
});

window.addEventListener("unhandledrejection", (event) => {
  report("js-reject", String(event.reason));
});
