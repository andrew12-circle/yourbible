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

/** Book scene top inset — collapsed mobile chrome only needs the pull handle band. */
export function readerSceneTopOffsetClass(compactChrome: boolean, containedInHub: boolean): string {
  if (!compactChrome) {
    return "top-[calc(var(--safe-area-inset-top)+3.25rem)]";
  }
  if (containedInHub) {
    return "top-0";
  }
  return "top-[calc(var(--safe-area-inset-top)+1.75rem)]";
}

/** Page-turn tap zones track the book scene top inset. */
export function readerPageTurnTopOffsetClass(compactChrome: boolean, containedInHub: boolean): string {
  if (!compactChrome) {
    return "top-[calc(var(--safe-area-inset-top)+5rem)]";
  }
  if (containedInHub) {
    return "top-10";
  }
  return "top-[calc(var(--safe-area-inset-top)+3rem)]";
}

/** Pull handle / header safe inset — hub card already reserves the status bar. */
export function readerChromeTopClass(containedInHub: boolean): string {
  return containedInHub ? "top-2" : "top-[calc(var(--safe-area-inset-top)+0.35rem)]";
}

export function readerHeaderSafePaddingClass(containedInHub: boolean): string {
  return containedInHub ? "pt-2" : "pt-[var(--safe-area-inset-top)]";
}
