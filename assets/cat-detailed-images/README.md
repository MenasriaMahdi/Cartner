# Tuxedo Cat Pixel Assets

These folders contain the extracted 8-bit tuxedo-cat sprites from the generated sprite sheet.

Each PNG is a transparent 160x128 canvas. The cat itself is centered so frames can be swapped without changing the `<img>` position.

## Folders

- `idle` — standing/idle animation frames
- `blink` — blink frames
- `happy` — happy/excited frames
- `walk_right` — walking to the right
- `walk_left` — walking to the left
- `run_right` — running to the right
- `run_left` — running to the left
- `jump` — jump animation
- `land` — landing animation
- `sit` — sitting poses
- `sleep` — sleeping animation
- `eat` — eating animation
- `drink` — drinking animation
- `play` — playing animation
- `stretch` — stretching animation
- `clean` — grooming/cleaning animation
- `hurt_sad` — sad/hurt expressions
- `surprised` — surprised expressions
- `angry` — angry expressions
- `icons_emotes` — small reaction/emote sprites

## Simple website usage

```html
<img id="cat" src="/assets/cat/idle/01.png" alt="Cat">
```

For an animation, change the image every frame:

```js
const frames = [
  "/assets/cat/idle/01.png",
  "/assets/cat/idle/02.png",
  "/assets/cat/idle/03.png",
  "/assets/cat/idle/04.png",
];

let frame = 0;

setInterval(() => {
  document.querySelector("#cat").src = frames[frame];
  frame = (frame + 1) % frames.length;
}, 150);
```

For the first version of the app, start with `idle`, `walk_right`, `walk_left`, `drink`, `eat`, and `sleep`.

