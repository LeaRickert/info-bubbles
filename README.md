# Info Bubbles

A single-page experiment: bubbles drift slowly up the screen. Hover one to pause it, click it to pop it, and its title glides into a panel that reveals a description (text and images).

## Why this exists

Mostly to make something fun and artsy. It's also a small exploration of how **non-hierarchical information** could be presented. There are no menus, ordering or categories. Each piece of content is a bubble, and visitors stumble on things by chance rather than navigating a tree.

It was also an experiment in building with prompt iteration only. None of the code was written by hand. The whole page, `index.html`, came out of a series of short, iterative prompts to Claude Code, each one changing or adding a behavior. The evolution below follows that conversation in order.

## Run it

No build step and no dependencies. Open `index.html` in a browser.

The sample entries load placeholder photos from `picsum.photos`, so those need an internet connection. Replace them with your own images.

## Adding your own content

Edit the `ITEMS` list near the top of the script in `index.html`:

```js
{
  title: "Rainbow Colours",
  image: "https://…/photo.jpg",   // optional: faint featured image inside the bubble
  body: `<p>Any HTML: text, images, links…</p>`
}
```

## How it behaves

- **Floating:** bubbles are 200px up to 20% of the page width, rise at varying speeds, sway sideways and drift off course. When one leaves the top it respawns at the bottom.
- **Hover or keyboard focus:** the bubble pauses, glows, and shows its title inside the bubble, wrapped to the circle.
- **Click or Enter:** the bubble pops. The title widens to one line, grows and glides into the modal, then the description fades in.
- **Close:** the × button, Esc, or a click outside the modal. The bubble re-forms at the bottom.
- **Background:** hue follows the mouse's x position and lightness follows its y position. It's dark at the top and light at the bottom, and it updates only when the mouse is still.
- **Static layout:** a list on phones and a grid on desktop. It's used automatically when `prefers-reduced-motion` is set, or via the toggle in the top-right.
- **Settings:** a gear in the bottom-left lets visitors change minimum size, minimum and maximum speed, and the max sway ratio. Changes apply to bubbles as they respawn.

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

## Files

- `index.html` is the whole project: markup, styles and script.
- `README.md` is this file.

## Notes and limitations

- Images from `picsum.photos` are a placeholder and are loaded from a third-party site.
- Settings aren't saved between visits.
- The page was checked in the in-app browser preview at desktop and phone widths. It hasn't been tested across other browsers or on real devices.
