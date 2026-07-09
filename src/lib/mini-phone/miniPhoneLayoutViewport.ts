import {
  IPHONE_PRO_MAX_HEIGHT_PT,
  IPHONE_PRO_MAX_WIDTH_PT,
} from "@/lib/mini-phone/miniPhoneDimensions";

export const MINI_PHONE_LAYOUT_WIDTH = IPHONE_PRO_MAX_WIDTH_PT;

/** CSS custom properties set on `[data-mini-phone-app]` by `MiniPhoneAppView`. */
export const MINI_PHONE_LAYOUT_WIDTH_VAR = "--mini-phone-layout-width";
export const MINI_PHONE_LAYOUT_HEIGHT_VAR = "--mini-phone-layout-height";
export const MINI_PHONE_LAYOUT_SCALE_VAR = "--mini-phone-layout-scale";

export type MiniPhoneLayoutViewport = {
  width: number;
  height: number;
  landscape: boolean;
};

/** Active mini-phone app frame, if the drawer is open with an app loaded. */
export function queryMiniPhoneAppRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>("[data-mini-phone-app]");
}

export function isInsideMiniPhoneApp(node?: Node | null): boolean {
  if (typeof document === "undefined") return false;
  if (node instanceof Element && node.closest("[data-mini-phone-app]")) return true;
  return Boolean(queryMiniPhoneAppRoot());
}

function readPxVar(root: HTMLElement, name: string): number | null {
  const inline = root.style.getPropertyValue(name).trim();
  if (inline) {
    const n = parseFloat(inline);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const computed = getComputedStyle(root).getPropertyValue(name).trim();
  if (computed) {
    const n = parseFloat(computed);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Logical iPhone layout size inside the scaled mini-phone embed (portrait). */
export function readMiniPhoneLayoutViewport(): MiniPhoneLayoutViewport | null {
  const root = queryMiniPhoneAppRoot();
  if (!root) return null;

  const width = readPxVar(root, MINI_PHONE_LAYOUT_WIDTH_VAR) ?? MINI_PHONE_LAYOUT_WIDTH;
  let height = readPxVar(root, MINI_PHONE_LAYOUT_HEIGHT_VAR);
  if (!height) {
    const scale = readPxVar(root, MINI_PHONE_LAYOUT_SCALE_VAR) ?? 1;
    const frameH = root.clientHeight;
    height = frameH > 0 && scale > 0 ? frameH / scale : IPHONE_PRO_MAX_HEIGHT_PT;
  }

  return { width, height, landscape: false };
}

/** Width/height for layout math — mini-phone logical size when embedded, else browser viewport. */
export function readEffectiveLayoutViewport(): MiniPhoneLayoutViewport {
  const mini = readMiniPhoneLayoutViewport();
  if (mini) return mini;

  if (typeof window === "undefined") {
    return { width: 1280, height: 800, landscape: true };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const landscape =
    window.matchMedia("(orientation: landscape)").matches || width > height;
  return { width, height, landscape };
}

export function readEffectiveLayoutWidth(): number {
  return readEffectiveLayoutViewport().width;
}

export function readEffectiveLayoutHeight(): number {
  return readEffectiveLayoutViewport().height;
}

export function isEffectiveCompactLayout(): boolean {
  if (queryMiniPhoneAppRoot()) return true;
  if (typeof window === "undefined") return false;
  return Math.min(window.innerWidth, window.innerHeight) < 768;
}
