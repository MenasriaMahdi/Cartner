import { emit } from "@tauri-apps/api/event";
import { type Task, MAX_TASKS } from "../types";

const STORAGE_KEY = "mochi.tasks.v1";
export const TASKS_CHANGED_EVENT = "mochi:tasks-changed";

export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

function finitePosNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

function sanitizeTask(raw: unknown): Task | null {
  const o = asRecord(raw);
  const title = typeof o["title"] === "string" ? o["title"].trim() : "";
  if (title === "") return null;
  return {
    id: typeof o["id"] === "string" && o["id"] !== "" ? o["id"] : randomId(),
    title,
    dueAt: finitePosNumber(o["dueAt"]),
    done: typeof o["done"] === "boolean" ? o["done"] : false,
    createdAt: finitePosNumber(o["createdAt"]) ?? 0,
    remindedAt: finitePosNumber(o["remindedAt"]),
  };
}

export function sanitizeTasks(raw: unknown): Task[] {
  const list = Array.isArray(raw) ? raw : [];
  const tasks: Task[] = [];
  for (const item of list) {
    if (tasks.length >= MAX_TASKS) break;
    const task = sanitizeTask(item);
    if (task !== null) tasks.push(task);
  }
  return tasks;
}

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    return sanitizeTasks(JSON.parse(raw));
  } catch (error) {
    console.warn("mochi: failed to load tasks, using empty list", error);
    return [];
  }
}

/**
 * Persists tasks and broadcasts the change to every open window.
 * Listeners never re-save, so there is no event loop.
 */
export function saveTasks(input: Task[]): Task[] {
  const tasks = sanitizeTasks(input);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn("mochi: failed to persist tasks", error);
  }
  void emit(TASKS_CHANGED_EVENT, tasks).catch((error) =>
    console.warn("mochi: failed to broadcast tasks", error),
  );
  return tasks;
}
