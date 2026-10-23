// Injected once, the first time bubblefy() runs. Override the --bb-* custom properties on :root to theme it.
export const CSS = `
@property --bb-bg-top    { syntax: "<color>"; inherits: true; initial-value: #0b1d3a; }
@property --bb-bg-bottom { syntax: "<color>"; inherits: true; initial-value: #1d6f8f; }
:root {
  --bb-ink: #f4fbff;
  --bb-font: Georgia, "Times New Roman", serif;
  --bb-ui-font: system-ui, sans-serif;
  --bb-panel-bg: rgba(8, 20, 45, .82);
  --bb-overlay-bg: rgba(5, 15, 35, .72);
}

.bb-container { position: relative; overflow: hidden; }
.bb-container.bb-bg {
  --bb-bg-top: hsl(215 60% 12%);
  --bb-bg-bottom: hsl(195 55% 42%);
  background: linear-gradient(to top, var(--bb-bg-bottom), var(--bb-bg-top));
  transition: --bb-bg-top 3s ease, --bb-bg-bottom 3s ease;
}

/* ---------- bubbles ---------- */
.bb-bubble {
  position: absolute;
  left: 0; top: 0;
  border-radius: 50%;
  cursor: pointer;
  will-change: transform;
  color: var(--bb-ink);
  font-family: var(--bb-font);
  box-shadow: 0 0 18px rgba(160,230,255,.25);
  border: 1px solid rgba(255,255,255,.35);
  transition: filter .3s, box-shadow .3s;
}
.bb-bubble-img {
  position: absolute; inset: 0;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  opacity: .5;
  -webkit-mask-image: radial-gradient(circle, #000 55%, transparent 100%);
          mask-image: radial-gradient(circle, #000 55%, transparent 100%);
  pointer-events: none;
  transition: opacity .3s;
}
.bb-bubble:hover .bb-bubble-img, .bb-bubble.bb-paused .bb-bubble-img { opacity: .7; }
.bb-bubble-title {
  position: absolute;
  left: 50%; top: 50%;
  width: 68%;
  transform: translate(-50%, -50%);
  font-size: var(--bb-fs, 16px);
  letter-spacing: .04em;
  line-height: 1.15;
  text-align: center;
  text-wrap: balance;
  overflow-wrap: break-word;
  text-shadow: 0 1px 8px rgba(0,0,0,.65);
  opacity: 0;
  transition: opacity .3s;
  pointer-events: none;
  z-index: 1;
}
.bb-bubble:hover .bb-bubble-title, .bb-bubble.bb-paused .bb-bubble-title { opacity: 1; }
.bb-bubble::after {
  content: "";
  position: absolute; inset: 0;
  border-radius: 50%;
  pointer-events: none;
  background:
    radial-gradient(circle at 30% 28%, rgba(255,255,255,.85) 0 4%, transparent 14%),
    radial-gradient(circle at 50% 50%, rgba(255,255,255,.04) 55%, rgba(160,230,255,.28) 78%, rgba(255,150,230,.35) 92%, rgba(255,255,255,.55) 100%);
  box-shadow:
    inset 0 0 18px rgba(255,255,255,.35),
    inset -10px -14px 30px rgba(255,120,220,.25),
    inset 10px 12px 30px rgba(110,220,255,.25);
}
.bb-bubble:hover, .bb-bubble.bb-paused {
  filter: brightness(1.25) saturate(1.3);
  box-shadow: 0 0 34px rgba(190,240,255,.55);
}
.bb-bubble.bb-hidden { visibility: hidden; pointer-events: none; }

/* ---------- pop effect ---------- */
.bb-pop-ring {
  position: fixed;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,.8);
  pointer-events: none;
  animation: bb-ring .6s ease-out forwards;
}
@keyframes bb-ring {
  from { transform: scale(.9); opacity: 1; }
  to   { transform: scale(1.5); opacity: 0; border-width: 0; }
}
.bb-droplet {
  position: fixed;
  width: 10px; height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: rgba(220,245,255,.9);
  pointer-events: none;
  animation: bb-droplet .7s ease-out forwards;
}
@keyframes bb-droplet {
  to { transform: translate(var(--bb-dx), var(--bb-dy)) scale(.2); opacity: 0; }
}

/* ---------- reveal overlay + modal ---------- */
.bb-overlay {
  position: fixed; inset: 0;
  background: rgba(5, 15, 35, 0);
  pointer-events: none;
  transition: background 1.2s;
  z-index: 10;
}
.bb-overlay.bb-active { background: var(--bb-overlay-bg); pointer-events: auto; }

.bb-modal {
  position: fixed;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  width: min(720px, calc(100vw - 2rem));
  max-height: min(86dvh, 820px);
  display: flex;
  flex-direction: column;
  padding: 2rem 1.75rem 1.5rem;
  color: var(--bb-ink);
  font-family: var(--bb-font);
  background: var(--bb-panel-bg);
  -webkit-backdrop-filter: blur(14px);
          backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0,0,0,.45);
  opacity: 0;
  pointer-events: none;
  transition: opacity 1s ease;
  z-index: 11;
}
.bb-modal.bb-open { opacity: 1; pointer-events: auto; }
@media (max-width: 700px) {
  .bb-modal {
    width: calc(100vw - 1.25rem);
    height: calc(100dvh - 1.25rem);
    max-height: none;
    padding: 1.25rem 1rem 1rem;
    border-radius: 18px;
  }
}

/* invisible in-flow slot that reserves where the flying title lands */
.bb-title-slot {
  flex: none;
  margin: 0 2.75rem 1rem;
  font-weight: normal;
  letter-spacing: .04em;
  line-height: 1.15;
  text-align: center;
  visibility: hidden;
}

/* the title itself: flies from the bubble to the slot */
.bb-title {
  position: fixed;
  left: 0; top: 0;
  margin: 0;
  color: var(--bb-ink);
  font-family: var(--bb-font);
  font-weight: normal;
  letter-spacing: .04em;
  line-height: 1.15;
  text-align: center;
  text-wrap: balance;
  overflow-wrap: break-word;
  opacity: 0;
  z-index: 12;
  pointer-events: none;
  text-shadow: 0 2px 20px rgba(0,0,0,.4);
  will-change: transform, opacity;
}

.bb-description {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 .5rem;
  font-size: 1.1rem;
  line-height: 1.65;
  text-align: center;
  opacity: 0;
  transition: opacity 1.4s ease;
  pointer-events: none;
}
.bb-description.bb-show { opacity: 1; pointer-events: auto; }
.bb-description img {
  display: block;
  max-width: 100%;
  height: auto;
  max-height: 40vh;
  object-fit: contain;
  margin: 1rem auto;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0,0,0,.45);
}
.bb-description p { margin: 0 0 1rem; }

.bb-close {
  position: absolute;
  top: .75rem; right: .75rem;
  z-index: 2;
  background: none; border: 1px solid rgba(255,255,255,.5);
  color: var(--bb-ink);
  width: 2.5rem; height: 2.5rem;
  border-radius: 50%;
  font-size: 1.4rem; line-height: 1;
  cursor: pointer;
  opacity: 0; pointer-events: none;
  transition: opacity .6s, background .2s;
}
.bb-close.bb-show { opacity: 1; pointer-events: auto; }
.bb-close:hover { background: rgba(255,255,255,.15); }

/* ---------- layout toggle ---------- */
.bb-layout-toggle {
  position: fixed;
  top: 1rem; right: 1.25rem;
  z-index: 9;
  width: 2.5rem; height: 2.5rem;
  padding: 0;
  display: grid; place-items: center;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.5);
  border-radius: 50%;
  color: var(--bb-ink);
  cursor: pointer;
  transition: background .2s;
}
.bb-layout-toggle:hover { background: rgba(255,255,255,.2); }
.bb-layout-toggle svg { width: 1.2rem; height: 1.2rem; }
.bb-layout-toggle .bb-icon-float { display: none; }
.bb-static-ui .bb-layout-toggle .bb-icon-float { display: block; }
.bb-static-ui .bb-layout-toggle .bb-icon-grid { display: none; }

/* ---------- static layout: list on mobile, grid on desktop ---------- */
.bb-grid { display: none; }
.bb-container.bb-static { overflow-y: auto; }
html.bb-static, body.bb-static { height: auto; min-height: 100%; overflow-y: auto; }
body.bb-static { background-attachment: fixed; }
.bb-container.bb-focus-open, html.bb-focus-open, body.bb-focus-open { overflow: hidden; }
.bb-static > .bb-grid {
  display: grid;
  grid-template-columns: 1fr;
  justify-items: center;
  gap: 2rem;
  padding: 5rem 1.25rem 3rem;
  max-width: 1200px;
  margin: 0 auto;
}
@media (min-width: 700px) {
  .bb-static > .bb-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 2.5rem 1.5rem;
  }
}
.bb-static .bb-bubble {
  position: relative;
  transform: none !important;
  width: 240px !important;
  height: 240px !important;
  --bb-fs: 24px !important;
}
.bb-static .bb-bubble-title { opacity: 1; }

@media (prefers-reduced-motion: reduce) {
  .bb-container.bb-bg { transition: none; }
  .bb-pop-ring, .bb-droplet { animation-duration: .01s; }
}
`;
