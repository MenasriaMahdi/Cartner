import { listen } from "@tauri-apps/api/event";
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
    throw new Error(`mochi: #${id} is not a form`);
  }
  return el;
}

function requireInput(id: string): HTMLInputElement {
  const el = requireElement(id);
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`mochi: #${id} is not an input`);
  }
  return el;
}

let tasks: Task[] = loadTasks();

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

function buildItem(task: Task): HTMLLIElement {
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
  li.append(title);

  if (task.dueAt !== undefined) {
    const due = document.createElement("span");
    due.className = "task-due" + (task.dueAt < Date.now() ? " overdue" : "");
    due.textContent = `⏰ ${formatDue(task.dueAt)}`;
    li.append(due);
  }

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
  render();
});

render();
