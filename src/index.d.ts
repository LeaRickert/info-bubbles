export interface BubbleItem {
  title: string;
  /** Shown in the modal after popping. A string is inserted as HTML, so only pass content you trust. */
  body?: string | Node;
  /** Optional faint featured image shown inside the bubble. */
  image?: string;
}

export interface BubbleSettings {
  /** Minimum bubble diameter in px. */
  minSize: number;
  /** Minimum rise speed in px/second. */
  minSpeed: number;
  /** Maximum rise speed in px/second. */
  maxSpeed: number;
  /** Peak sway speed ÷ rise speed. */
  maxSwayRatio: number;
  /** Largest bubble as a fraction of the container width (never below minSize). */
  maxSizeFraction: number;
  /** ms the popped title takes to widen to a single line. */
  unwrapMs: number;
  /** ms the title takes to glide into the modal. */
  travelMs: number;
  /** ms to wait after the title arrives before the body fades in. */
  descDelayMs: number;
}

export interface BackgroundOptions {
  /** [left, right] hue in degrees. */
  hue: [number, number];
  saturation: number;
  /** [top, bottom] lightness % of the top gradient stop. */
  topLightness: [number, number];
  /** [top, bottom] lightness % of the bottom gradient stop. */
  bottomLightness: [number, number];
  /** Hue offset of the bottom stop. */
  hueShift: number;
}

export interface BubblefyOptions {
  /** Element (or selector) the bubbles float in. Default: document.body. */
  container?: string | HTMLElement;
  settings?: Partial<BubbleSettings>;
  /** Button that switches between floating and static layouts. Default: true. */
  layoutToggle?: boolean;
  /** Pointer-driven gradient background on the container. Default: false. */
  background?: boolean | Partial<BackgroundOptions>;
  /** Build the modal content yourself, e.g. to sanitise it. Default: `item.body`. */
  renderBody?: (item: BubbleItem, index: number) => string | Node;
  /** Start in static layout. Default: only when prefers-reduced-motion is set. */
  static?: boolean;
  onOpen?: (item: BubbleItem, index: number) => void;
  onClose?: (item: BubbleItem, index: number) => void;
}

export interface BubblefyInstance {
  open(index: number): void;
  close(): void;
  setStatic(on: boolean): void;
  updateSettings(settings: Partial<BubbleSettings>): void;
  updateBackground(background: Partial<BackgroundOptions>): void;
  destroy(): void;
}

export const DEFAULT_SETTINGS: BubbleSettings;
export const DEFAULT_BACKGROUND: BackgroundOptions;
export function bubblefy(items: BubbleItem[], options?: BubblefyOptions): BubblefyInstance;
export default bubblefy;
