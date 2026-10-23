# Info Bubbles

A single-page experiment: bubbles drift slowly up the screen. Hover one to pause it, click it to pop it, and its title glides into a panel that reveals a description (text and images).

## Why this exists

Mostly to make something fun and artsy. It's also a small exploration of how **non-hierarchical information** could be presented. There are no menus, ordering or categories. Each piece of content is a bubble, and visitors stumble on things by chance rather than navigating a tree.

The whole thing, originally a single `index.html`, came out of a series of short, iterative prompts to Claude Code, each one changing or adding a behavior. The evolution below follows that conversation in order.

## Install

```bash
npm install bubblefy
```

## Use it

```js
import { bubblefy } from "bubblefy";

const bubbles = bubblefy(
  [
    {
      title: "Rainbow Colours",
      image: "https://…/photo.jpg",   // optional: faint featured image inside the bubble
      body: `<p>Any HTML: text, images, links…</p>`  // or a DOM Node
    },
  ],
  { container: "#sky", background: true }
);

bubbles.destroy(); // removes every element, listener and timer it added
```

Styles are injected automatically, so there is nothing else to import. `body` strings are inserted as HTML, so only pass content you trust.

The container needs a height; if it has none, a console warning says so. The default, `document.body`, needs `html, body { height: 100% }`.

### Options

| Option | Default | |
| --- | --- | --- |
| `container` | `document.body` | Element or selector the bubbles float in. |
| `settings` | `DEFAULT_SETTINGS` | `minSize`, `minSpeed`, `maxSpeed`, `maxSwayRatio`, `maxSizeFraction`, and the pop timings `unwrapMs`, `travelMs`, `descDelayMs`. |
| `layoutToggle` | `true` | Button to switch between floating and static layouts. |
| `background` | `false` | Gradient on the container that follows the pointer. Pass an object to change `hue`, `saturation`, `topLightness`, `bottomLightness` or `hueShift` (see `DEFAULT_BACKGROUND`). |
| `renderBody` | | `(item, index) => string \| Node` to build the modal content yourself, e.g. to sanitise it. |
| `static` | reduced-motion | Start in the static layout. |
| `onOpen`, `onClose` | | `(item, index) => void` callbacks. |

The returned instance has `open(index)`, `close()`, `setStatic(on)`, `updateSettings(partial)`, `updateBackground(partial)` and `destroy()`. `updateSettings` takes effect as bubbles respawn. The demo's gear panel is built on it, and is not part of the package.

### Theming

Override these on `:root`: `--bb-ink`, `--bb-font`, `--bb-ui-font`, `--bb-panel-bg`, `--bb-overlay-bg`. All class names are prefixed `bb-`.

## Run the demo

```bash
npm install
npm run dev
```

The demo (`demo/index.html`) loads placeholder photos from `picsum.photos`, so it needs an internet connection. `npm run build:demo` produces a static site in `demo/dist`.

## Adding your own content to the demo

Edit the `items` list in `demo/index.html`.

## How it behaves

- **Floating:** bubbles are 200px up to 20% of the page width, rise at varying speeds, sway sideways and drift off course. When one leaves the top it respawns at the bottom.
- **Hover or keyboard focus:** the bubble pauses, glows, and shows its title inside the bubble, wrapped to the circle.
- **Click or Enter:** the bubble pops. The title widens to one line, grows and glides into the modal, then the description fades in.
- **Close:** the × button, Esc, or a click outside the modal. The bubble re-forms at the bottom.
- **Background:** hue follows the mouse's x position and lightness follows its y position. It's dark at the top and light at the bottom, and it updates only when the mouse is still.
- **Static layout:** a list on phones and a grid on desktop. It's used automatically when `prefers-reduced-motion` is set, or via the toggle in the top-right.
- **Settings (demo only):** a gear in the bottom-left opens a scrollable panel with every option: bubble size, speed and sway, the pop animation timings, and the background hue, saturation and lightness ranges. Bubble settings apply as bubbles respawn, timings on the next pop, and background changes at once.

## How it evolved

Each step was a prompt in the chat.

1. **First version:** bubbles rise slowly from the bottom to the top, pause on hover, and pop on click. A title slowly moves to the page centre and then reveals a description with text and images. Sizes vary from a 200px minimum to a 20%-of-page-width maximum, and bubbles loop back to the bottom.
2. **Featured image:** an optional image shows semi-transparent inside the bubble, faded toward the rim, with the glass highlights on top.
3. **Title on hover:** the title appears inside the bubble in a smaller font, wrapped to fit the circle. When popped, it starts at that same size and shape before moving to the wider focus size.
4. **Unwrap before growing:** the title first widens to a single line and only then grows, so the text doesn't keep re-wrapping.
5. **Mouse-controlled background:** x controls hue and y controls lightness. The gradient stays dark at the top and light at the bottom, with separate lightness limits for each end.
6. **Static layout and reduced motion:** a list on mobile and a grid on desktop. It's used for `prefers-reduced-motion` and through a toggle icon in the top-right. Popping still works there, with motion removed.
7. **Calmer background:** debounced to 500ms of stillness, throttled to one change every 2 seconds, with values rounded to whole numbers. Each change fades in.
8. **Modal instead of a centred title:** long descriptions had made small screens scroll. The title and description now live in a centred panel that is almost fullscreen on mobile. Only the description scrolls, and the title stays pinned at the top.
9. **Wandering paths:** `baseX` is nudged to a random point between its last value and a new one, so bubbles no longer rise in straight lines. It was then adjusted twice. Large swings were capped, and the sway speed was limited relative to rise speed so slow bubbles don't look like they're shaking.
10. **Better respawn spacing:** discussed several ideas, including column buckets. Testing showed that trying several random positions and choosing among the roomiest few worked much better. Respawns are also kept at least 1.5 seconds apart.
11. **Visitor controls:** a gear opens a settings panel with debounced sliders. The values only affect bubbles that respawn afterwards, and existing bubbles are left alone.
12. **Convert to npm-style package:** first stage at transforming into a reusable package format

## Files

- `src/index.js` is the library: `bubblefy()`.
- `src/styles.js` holds the CSS, injected on first use.
- `src/index.d.ts` has the TypeScript types.
- `demo/index.html` is the demo page.
- `README.md` is this file.

## Notes and limitations

- Images from `picsum.photos` are a placeholder and are loaded from a third-party site.
- Settings aren't saved between visits.
- The page was checked in the in-app browser preview at desktop and phone widths. It hasn't been tested across other browsers or on real devices.
