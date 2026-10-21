const SVG_NS = "http://www.w3.org/2000/svg";

/** Cell size in viewBox units and the margin inside the 120x120 cat viewBox. */
const CELL = 7;
const OFFSET = 4;

/**
 * Palette for Mochi's 8-bit sprite: ink outlines so the shape reads on any
 * wallpaper, Mochi's orange fur with dark tabby stripes, cream bib + muzzle
 * + mittens, pink inner ears and nose.
 */
const PALETTE: Record<string, string> = {
  O: "#3d3129", // ink outline and eyes
  F: "#f8b45f", // orange fur
  T: "#d98e3b", // tabby stripes
  W: "#fff6e6", // cream bib, muzzle and mittens
  P: "#f9cfd1", // pink inner ears
  N: "#e77e7e", // pink nose
};

/** Eyes-open frame. Every row is exactly 16 cells wide. */
const FRAME_OPEN: string[] = [
  "..OO........OO..",
  "..OFPO....OPFO..",
  "..OOOOOOOOOOOO..",
  "..OFFFFTTFFFFO..",
  "..OFFFFTTFFFFO..",
  "..OFOOFFFFOOFO..",
  "..OFOOFFFFOOFO..",
  "..OFFWWWWWWFFO..",
  "..OFFWWNNWWFFO..",
  "..OFFFWWWWFFFO..",
  "...OOOOOOOOOOO..",
  "...OFWWWWWWFFO..",
  "...OFWWWWWWFFO..",
  "...OFFFFFFFFFO..",
  "...OWWWWWWWWO...",
  "....OOOOOOOO....",
];

/** Eyes closed: idle blink, poke squint and the walking patter. */
const FRAME_CLOSED: string[] = [
  "..OO........OO..",
  "..OFPO....OPFO..",
  "..OOOOOOOOOOOO..",
  "..OFFFFTTFFFFO..",
  "..OFFFFTTFFFFO..",
  "..OFFFFFFFFFFO..",
  "..OFOOFFFFOOFO..",
  "..OFFWWWWWWFFO..",
  "..OFFWWNNWWFFO..",
  "..OFFFWWWWFFFO..",
  "...OOOOOOOOOOO..",
  "...OFWWWWWWFFO..",
  "...OFWWWWWWFFO..",
  "...OFFFFFFFFFO..",
  "...OWWWWWWWWO...",
  "....OOOOOOOO....",
];

/** Renders one sprite frame as run-length merged <rect> cells. */
function buildFrame(id: string, rows: string[]): SVGGElement {
  const group = document.createElementNS(SVG_NS, "g");
  group.id = id;
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x] ?? "";
      const fill = PALETTE[ch];
      if (fill === undefined) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", String(OFFSET + x * CELL));
      rect.setAttribute("y", String(OFFSET + y * CELL));
      rect.setAttribute("width", String((end - x) * CELL));
      rect.setAttribute("height", String(CELL));
      rect.setAttribute("fill", fill);
      group.append(rect);
      x = end;
    }
  });
  return group;
}

/** Injects both sprite frames into the #pixel-cat anchor. Runs once at boot. */
export function installPixelCat(): void {
  const host = document.getElementById("pixel-cat");
  if (host === null) {
    console.warn("mochi: #pixel-cat anchor missing");
    return;
  }
  host.append(buildFrame("pixel-frame-open", FRAME_OPEN));
  host.append(buildFrame("pixel-frame-closed", FRAME_CLOSED));
}
