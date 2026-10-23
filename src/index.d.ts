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
}

export interface BubblefyOptions {
  /** Element (or selector) the bubbles float in. Default: document.body. */
  container?: string | HTMLElement;
  settings?: Partial<BubbleSettings>;
  /** Button that switches between floating and static layouts. Default: true. */
  layoutToggle?: boolean;
  /** Panel that lets visitors tweak the physics. Default: false. */
  settingsPanel?: boolean;
  /** Pointer-driven gradient background on the container. Default: false. */
  background?: boolean;
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
  destroy(): void;
}

export const DEFAULT_SETTINGS: BubbleSettings;
export function bubblefy(items: BubbleItem[], options?: BubblefyOptions): BubblefyInstance;
export default bubblefy;
