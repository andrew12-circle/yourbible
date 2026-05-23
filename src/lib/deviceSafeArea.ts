function parsePixelValue(value: string): number {
  const px = Number.parseFloat(value);
  return Number.isFinite(px) ? px : 0;
}

export function readSafeAreaInsetBottom(): number {
  if (typeof document === "undefined" || !document.body) return 0;

  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.paddingBottom = "env(safe-area-inset-bottom)";
  document.body.appendChild(probe);

  const value = window.getComputedStyle(probe).paddingBottom;
  probe.remove();

  return parsePixelValue(value);
}
