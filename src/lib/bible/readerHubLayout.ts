/** Persisted preference: expand Bible reader over the hub shell on desktop. */
export const LS_READER_HUB_FULLSCREEN = "yb.reader.hubFullscreen";

export function readReaderHubFullscreen(): boolean {
  try {
    return localStorage.getItem(LS_READER_HUB_FULLSCREEN) === "1";
  } catch {
    return false;
  }
}

export function writeReaderHubFullscreen(value: boolean) {
  try {
    localStorage.setItem(LS_READER_HUB_FULLSCREEN, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** `fixed` for viewport chrome; `absolute` when nested in the hub content card. */
export function readerOverlayPosition(containedInHub: boolean) {
  return containedInHub ? "absolute" : "fixed";
}

/** Compact top inset for hub shell readers (embedded card or fullscreen overlay). */
export function readerSceneTopOffsetClass(compactChrome: boolean, hubCompactChrome: boolean): string {
  if (hubCompactChrome) {
    return "top-0";
  }
  if (!compactChrome) {
    return "top-[calc(var(--safe-area-inset-top)+3.25rem)]";
  }
  return "top-[calc(var(--safe-area-inset-top)+1.75rem)]";
}

/** Page-turn tap zones track the book scene top inset. */
export function readerPageTurnTopOffsetClass(compactChrome: boolean, hubCompactChrome: boolean): string {
  if (hubCompactChrome) {
    return "top-10";
  }
  if (!compactChrome) {
    return "top-[calc(var(--safe-area-inset-top)+5rem)]";
  }
  return "top-[calc(var(--safe-area-inset-top)+3rem)]";
}

/** Pull handle / header safe inset — hub shell already reserves the status bar. */
export function readerChromeTopClass(hubCompactChrome: boolean): string {
  return hubCompactChrome ? "top-2" : "top-[calc(var(--safe-area-inset-top)+0.35rem)]";
}

export function readerHeaderSafePaddingClass(hubCompactChrome: boolean): string {
  return hubCompactChrome ? "pt-2" : "pt-[var(--safe-area-inset-top)]";
}
