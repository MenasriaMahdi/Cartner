import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { listen } from "@tauri-apps/api/event";
import { pulseReminder, showBubble } from "./cat";
import {
  loadTasks,
  sanitizeTasks,
  saveTasks,
  TASKS_CHANGED_EVENT,
} from "./state/tasks";
import type { Task } from "./types";

let tasks: Task[] = [];
let nextTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * The cat window owns task reminders: exactly one timer for the earliest
 * pending due task, rescheduled whenever the task list changes.
 */
export function initializeTaskReminders(): void {
  applyTasks(loadTasks());
  void listen(TASKS_CHANGED_EVENT, (event) => {
    applyTasks(sanitizeTasks(event.payload));
  }).catch((error) => console.warn("cartner: could not listen for tasks", error));
}

function applyTasks(next: Task[]): void {
  tasks = next;
  scheduleNext();
}

function byDue(a: Task, b: Task): number {
  return (a.dueAt ?? 0) - (b.dueAt ?? 0);
}

function pending(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => !t.done && t.dueAt !== undefined && t.remindedAt === undefined)
    .sort(byDue);
}

function scheduleNext(): void {
  clearTimeout(nextTimer);
  nextTimer = undefined;
  const earliest = pending(tasks)[0];
  if (earliest === undefined) return;
  const dueAt = earliest.dueAt;
  if (dueAt === undefined) return;
  const delay = Math.max(0, dueAt - Date.now());
  if (delay === 0) {
    void fireTask(earliest);
    return;
  }
  nextTimer = setTimeout(() => void fireTask(earliest), delay);
}

async function fireTask(task: Task): Promise<void> {
  let text = `🐱 Task: ${task.title}`;
  if (text.length > 60) text = `${text.slice(0, 57)}…`;
  showBubble(text);
  pulseReminder();
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (granted) {
      sendNotification({ title: "Cartner task reminder 🐱", body: task.title });
    }
  } catch (error) {
    // the speech bubble already covers this; native notification is a bonus
    console.warn("cartner: native notification unavailable", error);
  }
  tasks = saveTasks(
    tasks.map((t) =>
      t.id === task.id && t.remindedAt === undefined
        ? { ...t, remindedAt: Date.now() }
        : t,
    ),
  ); // the broadcast re-enters applyTasks → schedules the next task
}
