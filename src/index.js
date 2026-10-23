import { CSS } from "./styles.js";

/** Visitor-adjustable physics. Read each time a bubble (re)spawns. */
export const DEFAULT_SETTINGS = {
  minSize: 200,        // px
  minSpeed: 18,        // px / second
  maxSpeed: 42,
  maxSwayRatio: 0.6,   // peak sway speed ÷ rise speed, so slow bubbles don't look like they're shaking
  maxSizeFraction: 0.2, // largest bubble as a fraction of the container width (never below minSize)
  unwrapMs: 700,       // popped title widens to a single line before it starts to grow
  travelMs: 2800,      // how slowly the title glides into the modal
  descDelayMs: 300,    // pause after arriving before the description fades in
};

/** Pointer-driven background. Hue follows pointer X, lightness follows pointer Y. */
export const DEFAULT_BACKGROUND = {
  hue: [190, 300],               // left → right
  saturation: 58,                // %
  topLightness: [6, 20],         // top → bottom of the screen, lightness % of the top stop
  bottomLightness: [30, 55],     // same for the bottom stop
  hueShift: -15,                 // bottom stop hue offset, for a little depth
};


// Background: pointer X sets the hue, pointer Y sets the lightness.
// The top colour stays dark and the bottom stays light; each has its own limits.
const BG_DEBOUNCE_MS = 500;     // apply only after the pointer has been still this long
const BG_THROTTLE_MS = 2000;    // and no more often than this

const MIN_WOBBLE_FREQ = 0.12;   // Hz floor, so capping never makes the sway vanish into a stall

const SPAWN_CANDIDATES = 12;    // random X positions tried for each respawn
const SPAWN_PICKS = 3;          // then choose randomly among this many roomiest ones
const MIN_SPAWN_GAP_S = 1.5;    // minimum seconds between one respawn and the next

const DRIFT_EVERY = [1.5, 4];   // seconds between course changes (min, max)
const DRIFT_MAX = 60;           // px: the furthest a single course change can move baseX
const DRIFT_EASE = 1.2;         // how quickly baseX settles on its new course


const ICONS = {
  grid: `<svg class="bb-icon-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/>
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>`,
  float: `<svg class="bb-icon-float" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <circle cx="8" cy="15.5" r="5"/><circle cx="16.5" cy="7" r="3.5"/></svg>`,
};

const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => Math.min(1, Math.max(0, v));

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-bubblefy", "");
  style.textContent = CSS;
  document.head.prepend(style);   // prepend so a host page's own CSS wins ties
}

let instanceCount = 0;

/**
 * Turn a list of items into floating, poppable bubbles.
 *
 * @param {Array<{title: string, body?: string | Node, image?: string}>} items
 *   `body` is shown in the modal after popping; a string is inserted as HTML, so only pass content you trust.
 * @param {object} [options]
 * @param {string | HTMLElement} [options.container=document.body]
 * @param {Partial<typeof DEFAULT_SETTINGS>} [options.settings]
 * @param {boolean} [options.layoutToggle=true]    button to switch between floating and static layouts
 * @param {boolean | Partial<typeof DEFAULT_BACKGROUND>} [options.background=false]
 *   gradient on the container that follows the pointer; pass an object to change its colours
 * @param {(item: object, index: number) => string | Node} [options.renderBody]
 *   build the modal content yourself, e.g. to sanitise it (default: `item.body`)
 * @param {boolean} [options.static]               start in static layout (default: only if prefers-reduced-motion)
 * @param {(item: object, index: number) => void} [options.onOpen]
 * @param {(item: object, index: number) => void} [options.onClose]
 */
export function bubblefy(items, options = {}) {
  if (typeof document === "undefined") throw new Error("bubblefy needs a browser DOM");
  injectStyles();

  const container = typeof options.container === "string"
    ? document.querySelector(options.container)
    : options.container || document.body;
  if (!container) throw new Error("bubblefy: container not found");
  const isPage = container === document.body;
  const staticHosts = isPage ? [container, document.documentElement] : [container];

  const settings = { ...DEFAULT_SETTINGS, ...options.settings };
  const id = "bb" + ++instanceCount;

  const cleanups = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const make = (tag, cls, parent, props) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (props) Object.assign(e, props);
    if (parent) parent.appendChild(e);
    return e;
  };

  const width = () => isPage ? window.innerWidth : container.clientWidth;
  const height = () => isPage ? window.innerHeight : container.clientHeight;

  container.classList.add("bb-container");
  const bgConfig = { ...DEFAULT_BACKGROUND, ...(typeof options.background === "object" ? options.background : null) };
  if (options.background) container.classList.add("bb-bg");

  /* ---------- DOM ---------- */
  const overlay = make("div", "bb-overlay", document.body);
  const titleEl = make("h2", "bb-title", document.body);
  const modalEl = make("div", "bb-modal", document.body, { role: "dialog" });
  modalEl.setAttribute("aria-modal", "true");
  modalEl.setAttribute("aria-labelledby", id + "-slot");
  const closeBtn = make("button", "bb-close", modalEl, { innerHTML: "&times;", type: "button" });
  closeBtn.setAttribute("aria-label", "Close");
  const slotEl = make("h2", "bb-title-slot", modalEl, { id: id + "-slot" });
  const descEl = make("div", "bb-description", modalEl);
  const grid = make("div", "bb-grid", container);

  const ui = make("div", "bb-ui", document.body);
  let layoutBtn = null;
  if (options.layoutToggle !== false) {
    layoutBtn = make("button", "bb-layout-toggle", ui, { type: "button", innerHTML: ICONS.grid + ICONS.float });
    layoutBtn.setAttribute("aria-pressed", "false");
    layoutBtn.setAttribute("aria-label", "Switch to grid layout");
    layoutBtn.title = "Switch layout";
  }

  /* ---------- bubbles ---------- */
  const bubbles = [];
  let lastSpawnAt = -Infinity;

  const maxSize = () => Math.max(settings.minSize, width() * settings.maxSizeFraction);
  const bubbleFontSize = size => Math.round(size * 0.1);

  // horizontal range a bubble's centre line may use, leaving room for its sway
  function xRange(b) {
    const min = b.wobbleAmp;
    return [min, Math.max(min, width() - b.size - b.wobbleAmp)];
  }

  // How much an existing bubble matters to a spawn at the bottom edge: 1 when it is
  // at the bottom, falling to 0 a full screen height above.
  function spawnWeight(o) {
    const distFromSpawnLine = Math.max(0, height() - (o.y + o.size));
    return Math.max(0, 1 - distFromSpawnLine / height());
  }

  // Try several random positions, score each by the gap to its nearest neighbour,
  // then pick randomly from the best few so the result still looks random.
  function pickSpawnX(b) {
    const [lo, hi] = xRange(b);
    const others = bubbles.filter(o => o !== b && !o.popped);
    if (!others.length) return rand(lo, hi);

    const W = width();
    const scored = [];
    for (let i = 0; i < SPAWN_CANDIDATES; i++) {
      const x = rand(lo, hi);
      let score = Infinity;
      for (const o of others) {
        const gap = Math.abs((x + b.size / 2) - (o.baseX + o.size / 2)) - (b.size + o.size) / 2;
        score = Math.min(score, gap + (1 - spawnWeight(o)) * W);  // bubbles far above count as far away
      }
      scored.push({ x, score });
    }
    scored.sort((a, z) => z.score - a.score);
    const top = scored.slice(0, SPAWN_PICKS);
    return top[Math.floor(Math.random() * top.length)].x;
  }

  function randomiseBubble(b, startAnywhere) {
    b.size = rand(settings.minSize, maxSize());
    b.speed = rand(settings.minSpeed, settings.maxSpeed);
    b.wobbleAmp = rand(8, 30);
    b.wobbleFreq = rand(0.3, 0.8);
    // cap peak sway speed: slow the sway first, then (if at the floor) shrink the amplitude
    const maxSwaySpeed = b.speed * settings.maxSwayRatio;
    if (b.wobbleAmp * Math.PI * 2 * b.wobbleFreq > maxSwaySpeed) {
      b.wobbleFreq = Math.max(MIN_WOBBLE_FREQ, maxSwaySpeed / (b.wobbleAmp * Math.PI * 2));
      b.wobbleAmp = Math.min(b.wobbleAmp, maxSwaySpeed / (Math.PI * 2 * b.wobbleFreq));
    }
    b.baseX = startAnywhere ? rand(...xRange(b)) : pickSpawnX(b);
    b.goalX = b.baseX;
    b.nextShift = rand(...DRIFT_EVERY);
    b.phase = rand(0, Math.PI * 2);
    b.t = 0;
    if (startAnywhere) {
      b.y = rand(-b.size, height());
    } else {
      // hold the bubble just off-screen if another one spawned very recently
      const now = performance.now() / 1000;
      const wait = Math.max(0, MIN_SPAWN_GAP_S - (now - lastSpawnAt));
      lastSpawnAt = now + wait;
      b.y = height() + rand(0, 80) + b.speed * wait;
    }
    b.el.style.width = b.el.style.height = b.size + "px";
    b.el.style.setProperty("--bb-fs", bubbleFontSize(b.size) + "px");
  }

  items.forEach((item, i) => {
    const el = make("div", "bb-bubble", container);
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", item.title || "Pop bubble " + (i + 1));
    if (item.image) {
      const img = make("div", "bb-bubble-img", el);
      img.style.backgroundImage = `url("${String(item.image).replace(/["\\]/g, "\\$&")}")`;
    }
    make("div", "bb-bubble-title", el, { textContent: item.title });

    const b = { el, item, index: i, hovered: false, popped: false };
    randomiseBubble(b, true);
    // spread initial positions out so they don't all start in a clump
    b.y = height() - (i / items.length) * (height() + 200) + rand(-40, 40);

    on(el, "pointerenter", () => b.hovered = true);
    on(el, "pointerleave", () => b.hovered = false);
    on(el, "focus", () => b.hovered = true);
    on(el, "blur", () => b.hovered = false);
    on(el, "click", () => pop(b));
    on(el, "keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pop(b); }
    });
    bubbles.push(b);
  });

  /* ---------- pointer-driven background ---------- */
  const bg = { x: 0.5, y: 0.5 };
  function applyBackground() {
    const c = bgConfig;
    const hue  = Math.round(lerp(c.hue[0], c.hue[1], bg.x));
    const topL = Math.round(lerp(c.topLightness[0], c.topLightness[1], bg.y));
    const botL = Math.round(lerp(c.bottomLightness[0], c.bottomLightness[1], bg.y));
    container.style.setProperty("--bb-bg-top", `hsl(${hue} ${c.saturation}% ${topL}%)`);
    container.style.setProperty("--bb-bg-bottom", `hsl(${hue + c.hueShift} ${c.saturation}% ${botL}%)`);
  }
  if (options.background) {
    // Debounce: wait until the pointer has been still for BG_DEBOUNCE_MS.
    // Throttle: then apply at most once every BG_THROTTLE_MS.
    let debounce = null, pending = null, lastApplied = -Infinity;
    on(window, "pointermove", e => {
      bg.x = clamp01(e.clientX / window.innerWidth);
      bg.y = clamp01(e.clientY / window.innerHeight);
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (pending) return;                    // a throttled update is already queued; it reads the latest values
        const wait = Math.max(0, BG_THROTTLE_MS - (performance.now() - lastApplied));
        pending = setTimeout(() => {
          pending = null;
          lastApplied = performance.now();
          applyBackground();
        }, wait);
      }, BG_DEBOUNCE_MS);
    });
    cleanups.push(() => { clearTimeout(debounce); clearTimeout(pending); });
    applyBackground();
  }

  /* ---------- layout mode: floating bubbles vs. static list/grid ---------- */
  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  let staticMode = false;

  function setStatic(next) {
    staticMode = next;
    staticHosts.forEach(h => h.classList.toggle("bb-static", next));
    ui.classList.toggle("bb-static-ui", next);
    if (layoutBtn) {
      layoutBtn.setAttribute("aria-pressed", String(next));
      layoutBtn.setAttribute("aria-label", next ? "Switch to floating bubbles" : "Switch to grid layout");
    }
    for (const b of bubbles) {
      (next ? grid : container).appendChild(b.el);
      b.hovered = false;
      b.el.classList.remove("bb-paused");
      if (!next) b.el.style.transform = "";   // the loop takes over again
    }
    (isPage ? window : container).scrollTo(0, 0);
  }
  if (layoutBtn) on(layoutBtn, "click", () => setStatic(!staticMode));
  on(reduceMQ, "change", e => setStatic(e.matches));
  if (options.static ?? reduceMQ.matches) setStatic(true);

  /* ---------- animation loop ---------- */
  let last = performance.now();
  let raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);   // clamp after tab switches
    last = now;
    if (staticMode) return;

    for (const b of bubbles) {
      if (!b.popped && !b.hovered) {
        b.y -= b.speed * dt;
        b.t += dt;
        if (b.t >= b.nextShift) {
          // pick a new X within DRIFT_MAX of the last course, then head for a random point between the last course and it
          const [lo, hi] = xRange(b);
          const newX = Math.min(hi, Math.max(lo, b.goalX + rand(-DRIFT_MAX, DRIFT_MAX)));
          b.goalX = rand(Math.min(b.goalX, newX), Math.max(b.goalX, newX));
          b.nextShift = b.t + rand(...DRIFT_EVERY);
        }
        b.baseX += (b.goalX - b.baseX) * (1 - Math.exp(-DRIFT_EASE * dt));
        if (b.y < -b.size) randomiseBubble(b, false);   // floated off the top → back to the bottom
      }
      const x = b.baseX + Math.sin(b.t * b.wobbleFreq * Math.PI * 2 + b.phase) * b.wobbleAmp;
      b.el.style.transform = `translate3d(${x}px, ${b.y}px, 0)`;
      b.el.classList.toggle("bb-paused", b.hovered);
    }
  }
  raf = requestAnimationFrame(frame);

  function onResize() {
    const max = maxSize();
    for (const b of bubbles) {
      if (b.size > max) {
        b.size = max;
        b.el.style.width = b.el.style.height = max + "px";
        b.el.style.setProperty("--bb-fs", bubbleFontSize(max) + "px");
      }
      const [lo, hi] = xRange(b);
      b.baseX = Math.min(Math.max(b.baseX, lo), hi);
      b.goalX = Math.min(Math.max(b.goalX, lo), hi);
    }
    if (current && titleEl.style.opacity === "1") {
      const t = measureTitleTarget();
      titleEl.style.transition = "none";
      titleEl.style.fontSize = t.fs + "px";
      titleEl.style.transform = t.transform;
    }
  }
  on(window, "resize", onResize);
  if (!isPage && typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    cleanups.push(() => ro.disconnect());
  }

  /* ---------- pop + reveal ---------- */
  let current = null;
  let timers = [];
  let closeTimer = null;

  function burst(cx, cy, size) {
    const ring = make("div", "bb-pop-ring", document.body);
    ring.style.cssText = `left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px`;
    setTimeout(() => ring.remove(), 700);

    const n = 16;
    for (let i = 0; i < n; i++) {
      const d = make("div", "bb-droplet", document.body);
      const ang = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
      const dist = size / 2 * rand(0.9, 1.4);
      d.style.left = cx + Math.cos(ang) * size / 2 * 0.8 + "px";
      d.style.top  = cy + Math.sin(ang) * size / 2 * 0.8 + "px";
      d.style.setProperty("--bb-dx", Math.cos(ang) * dist * 0.5 + "px");
      d.style.setProperty("--bb-dy", Math.sin(ang) * dist * 0.5 + "px");
      setTimeout(() => d.remove(), 800);
    }
  }

  // Where the title ends up: the centre of the (invisible) slot at the top of the modal.
  // The font is the focus size, shrunk if needed so the title fits on one line in the modal.
  function measureTitleTarget() {
    const maxFs = Math.max(26, Math.min(window.innerWidth * 0.05, 56));
    slotEl.style.fontSize = maxFs + "px";
    const avail = slotEl.clientWidth;

    const saved = [titleEl.style.whiteSpace, titleEl.style.width, titleEl.style.fontSize, titleEl.style.transition];
    titleEl.style.transition = "none";
    titleEl.style.whiteSpace = "nowrap";
    titleEl.style.width = "max-content";
    titleEl.style.fontSize = maxFs + "px";
    const oneLine = titleEl.offsetWidth;
    [titleEl.style.whiteSpace, titleEl.style.width, titleEl.style.fontSize, titleEl.style.transition] = saved;

    const fs = oneLine > avail ? Math.max(18, Math.floor(maxFs * avail / oneLine)) : maxFs;
    slotEl.style.fontSize = fs + "px";            // slot is now exactly one line tall
    const sr = slotEl.getBoundingClientRect();
    return {
      fs,
      transform: `translate(${sr.left + sr.width / 2}px, ${sr.top + sr.height / 2}px) translate(-50%, -50%)`,
    };
  }

  function pop(b) {
    if (current) return;
    current = b;
    b.popped = true;
    b.hovered = false;

    const r = b.el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    b.el.classList.add("bb-hidden");
    burst(cx, cy, r.width);

    // fill the modal first so the title's landing spot can be measured
    descEl.replaceChildren();
    const body = options.renderBody ? options.renderBody(b.item, b.index) : b.item.body;
    if (body instanceof Node) descEl.appendChild(options.renderBody ? body : body.cloneNode(true));
    else if (body) descEl.innerHTML = body;
    descEl.scrollTop = 0;
    slotEl.textContent = b.item.title;
    measureTitleTarget();

    // title starts exactly as the in-bubble label (same size, width and wrapping),
    // then widens to one line, then glides into the modal while growing
    titleEl.textContent = b.item.title;
    titleEl.style.transition = "none";
    titleEl.style.opacity = "1";
    titleEl.style.whiteSpace = "normal";
    titleEl.style.width = r.width * 0.68 + "px";
    titleEl.style.fontSize = bubbleFontSize(r.width) + "px";
    // measure the single-line width at the starting font size
    titleEl.style.whiteSpace = "nowrap";
    titleEl.style.width = "max-content";
    const oneLine = titleEl.offsetWidth + 2;
    titleEl.style.whiteSpace = "normal";
    titleEl.style.width = r.width * 0.68 + "px";
    titleEl.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    void titleEl.offsetWidth; // commit start state

    staticHosts.forEach(h => h.classList.add("bb-focus-open"));
    overlay.classList.add("bb-active");
    modalEl.classList.add("bb-open");

    // phase 1: widen in place until the title is a single line
    const unwrapMs = reduceMQ.matches ? 0 : settings.unwrapMs;
    const travelMs = reduceMQ.matches ? 0 : settings.travelMs;
    titleEl.style.transition = `width ${unwrapMs}ms ease`;
    titleEl.style.width = Math.max(oneLine, r.width * 0.68) + "px";

    // phase 2: lock to one line, then glide to the slot while growing
    timers.push(setTimeout(() => {
      const t = measureTitleTarget();   // re-measure in case the window changed
      titleEl.style.whiteSpace = "nowrap";
      titleEl.style.width = "max-content";
      const ease = `${travelMs}ms cubic-bezier(.45,.05,.25,1)`;
      titleEl.style.transition = `transform ${ease}, font-size ${ease}`;
      titleEl.style.fontSize = t.fs + "px";
      titleEl.style.transform = t.transform;
    }, unwrapMs));

    timers.push(setTimeout(() => {
      descEl.classList.add("bb-show");
      closeBtn.classList.add("bb-show");
    }, unwrapMs + travelMs + settings.descDelayMs));

    options.onOpen?.(b.item, b.index);
  }

  function close() {
    if (!current) return;
    timers.forEach(clearTimeout); timers = [];
    const b = current;
    current = null;

    descEl.classList.remove("bb-show");
    closeBtn.classList.remove("bb-show");
    modalEl.classList.remove("bb-open");
    overlay.classList.remove("bb-active");
    staticHosts.forEach(h => h.classList.remove("bb-focus-open"));
    titleEl.style.transition = "opacity 500ms ease";
    titleEl.style.opacity = "0";

    // the bubble re-forms at the bottom and starts floating again
    closeTimer = setTimeout(() => {
      if (!staticMode) randomiseBubble(b, false);
      b.popped = false;
      b.el.classList.remove("bb-hidden");
    }, 500);

    options.onClose?.(b.item, b.index);
  }

  on(overlay, "click", close);
  on(closeBtn, "click", close);
  on(window, "keydown", e => {
    if (e.key !== "Escape") return;
    close();
  });

  // A container with no height collapses the layout (everything spawns off-screen), which is almost always missing CSS.
  // Checked a frame later so stylesheets that are still applying don't cause a false alarm.
  let destroyed = false;
  if (!isPage) {
    requestAnimationFrame(() => {
      if (!destroyed && container.clientHeight === 0) {
        console.warn("bubblefy: the container has a height of 0, so no bubbles will be visible. Give it an explicit height (e.g. `height: 100vh`), or `height: 100%` with every ancestor sized too.", container);
      }
    });
  }

  return {
    /** Pop the bubble at `index` as if it had been clicked. */
    open(index) { if (bubbles[index]) pop(bubbles[index]); },
    close,
    /** Switch between the static grid/list (true) and floating bubbles (false). */
    setStatic,
    /** Change settings. Physics apply to bubbles as they respawn; timings apply to the next pop. */
    updateSettings(partial) { Object.assign(settings, partial); },
    /** Change the background colours (needs the `background` option). */
    updateBackground(partial) {
      Object.assign(bgConfig, partial);
      if (options.background) applyBackground();
    },
    /** Remove every element, listener and timer this call added. */
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      clearTimeout(closeTimer);
      cleanups.forEach(fn => fn());
      staticHosts.forEach(h => h.classList.remove("bb-static", "bb-focus-open"));
      container.classList.remove("bb-container", "bb-bg");
      container.style.removeProperty("--bb-bg-top");
      container.style.removeProperty("--bb-bg-bottom");
      [overlay, titleEl, modalEl, ui, grid, ...bubbles.map(b => b.el)].forEach(e => e.remove());
    },
  };
}

export default bubblefy;
