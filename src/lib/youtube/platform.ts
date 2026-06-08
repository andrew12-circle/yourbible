/** iPhone / iPod (not iPad) — YouTube iframe cannot background in standalone PWA. */
export function isIphoneWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return true;
  const touchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (touchMac && typeof window !== "undefined") {
    return Math.min(window.screen.width, window.screen.height) <= 430;
  }
  return false;
}

export function isIpadWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPad/.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1 && !isIphoneWebKit();
}
