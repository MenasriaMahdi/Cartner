import "./report";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { requireElement } from "./dom";
import {
  loadTasks,
  randomId,
  sanitizeTasks,
  saveTasks,
  TASKS_CHANGED_EVENT,
} from "./state/tasks";
import { type Task, MAX_TASKS } from "./types";

const form = requireForm("task-form");
const titleInput = requireInput("task-title");
const dueInput = requireInput("task-due");
const listEl = requireElement("task-list") as HTMLUListElement;
const emptyEl = requireElement("task-empty");

function requireForm(id: string): HTMLFormElement {
  const el = requireElement(id);
  if (!(el instanceof HTMLFormElement)) {
    throw new Error(`cartner: #${id} is not a form`);
  }
  return el;
}

function requireInput(id: string): HTMLInputElement {
  const el = requireElement(id);
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`cartner: #${id} is not an input`);
  }
  return el;
}

let tasks: Task[] = loadTasks();
let editingId: string | null = null;

function byDueThenCreated(a: Task, b: Task): number {
  const dueA = a.dueAt ?? Number.MAX_SAFE_INTEGER;
  const dueB = b.dueAt ?? Number.MAX_SAFE_INTEGER;
  if (dueA !== dueB) return dueA - dueB;
  return a.createdAt - b.createdAt;
}

function byCreatedDesc(a: Task, b: Task): number {
  return b.createdAt - a.createdAt;
}

function formatDue(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Formats a timestamp the way <input type="datetime-local"> expects. */
function formatDateInput(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startEdit(id: string): void {
  editingId = id;
  render();
}

function cancelEdit(): void {
  editingId = null;
  render();
}

function applyEdit(
  task: Task,
  titleField: HTMLInputElement,
  dueField: HTMLInputElement,
): void {
  const nextTitle = titleField.value.trim();
  if (nextTitle === "" || tasks.length >= MAX_TASKS) {
    cancelEdit();
    return;
  }
  const raw = dueField.value;
  const dueTime = raw === "" ? NaN : new Date(raw).getTime();
  const nextDue = Number.isFinite(dueTime) ? dueTime : undefined;
  const dueChanged = nextDue !== task.dueAt;
  tasks = saveTasks(
    tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            title: nextTitle,
            dueAt: nextDue,
            // A changed time re-arms the reminder, even if it already fired.
            remindedAt: dueChanged ? undefined : t.remindedAt,
          }
        : t,
    ),
  );
  cancelEdit();
}

function buildItem(task: Task): HTMLLIElement {
  if (task.id === editingId) return buildEditItem(task);
  const li = document.createElement("li");
  li.dataset["taskId"] = task.id;
  if (task.done) li.className = "done";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "finish";
  toggle.title = task.done ? "Mark as not done" : "Mark as done";
  toggle.textContent = task.done ? "●" : "○";
  toggle.addEventListener("click", () => {
    tasks = saveTasks(tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    render();
  });
  li.append(toggle);

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;
  title.addEventListener("click", () => startEdit(task.id));
  li.append(title);

  if (task.dueAt !== undefined) {
    const due = document.createElement("span");
    due.className = "task-due" + (task.dueAt < Date.now() ? " overdue" : "");
    due.textContent = `⏰ ${formatDue(task.dueAt)}`;
    li.append(due);
  }

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "mini";
  edit.title = "Edit task";
  edit.textContent = "✎";
  edit.addEventListener("click", () => startEdit(task.id));
  li.append(edit);

  const del = document.createElement("button");
  del.type = "button";
  del.className = "del";
  del.title = "Delete task";
  del.textContent = "✕";
  del.addEventListener("click", () => {
    tasks = saveTasks(tasks.filter((t) => t.id !== task.id));
    render();
  });
  li.append(del);

  return li;
}

function buildEditItem(task: Task): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "editing";

  const titleField = document.createElement("input");
  titleField.type = "text";
  titleField.className = "edit-input edit-title";
  titleField.maxLength = 120;
  titleField.value = task.title;

  const when = document.createElement("div");
  when.className = "when-row";

  const dueField = document.createElement("input");
  dueField.type = "datetime-local";
  dueField.className = "edit-input edit-due";
  dueField.title = "Optional time";
  if (task.dueAt !== undefined) dueField.value = formatDateInput(task.dueAt);

  const save = document.createElement("button");
  save.type = "button";
  save.className = "mini save";
  save.title = "Save changes";
  save.textContent = "✓";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "mini cancel";
  cancel.title = "Cancel editing";
  cancel.textContent = "✕";

  const apply = (): void => applyEdit(task, titleField, dueField);
  const abort = (): void => cancelEdit();
  save.addEventListener("click", apply);
  cancel.addEventListener("click", abort);
  for (const field of [titleField, dueField]) {
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        apply();
      } else if (event.key === "Escape") {
        event.preventDefault();
        abort();
      }
    });
  }

  when.append(dueField, save, cancel);
  li.append(titleField, when);
  titleField.focus();
  titleField.select();
  return li;
}

function render(): void {
  const pending = tasks.filter((t) => !t.done).sort(byDueThenCreated);
  const done = tasks.filter((t) => t.done).sort(byCreatedDesc);
  listEl.replaceChildren(...[...pending, ...done].map(buildItem));
  emptyEl.hidden = tasks.length !== 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (title === "" || tasks.length >= MAX_TASKS) return;
  const rawDue = dueInput.value;
  const dueTime = rawDue === "" ? NaN : new Date(rawDue).getTime();
  const task: Task = {
    id: randomId(),
    title,
    dueAt: Number.isFinite(dueTime) ? dueTime : undefined,
    done: false,
    createdAt: Date.now(),
  };
  tasks = saveTasks([...tasks, task]);
  titleInput.value = "";
  dueInput.value = "";
  titleInput.focus();
  render();
});

void listen(TASKS_CHANGED_EVENT, (event) => {
  tasks = sanitizeTasks(event.payload);
  // Stop editing if the task disappeared while being edited (other window).
  if (editingId !== null && !tasks.some((t) => t.id === editingId)) {
    editingId = null;
  }
  render();
});

function syncWidgetChrome(): void {
  const head = requireElement("widget-head");
  head.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target !== null && target.closest("#widget-close") !== null) return;
    event.preventDefault();
    void getCurrentWindow()
      .startDragging()
      .catch((error) => console.warn("cartner: widget drag failed", error));
  });
  requireElement("widget-close").addEventListener("click", () => {
    void getCurrentWindow().close().catch((error) =>
      console.warn("cartner: widget close failed", error),
    );
  });
}

syncWidgetChrome();
render();
