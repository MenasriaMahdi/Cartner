export function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (el === null) {
    throw new Error(`mochi: #${id} not found`);
  }
  return el;
}
