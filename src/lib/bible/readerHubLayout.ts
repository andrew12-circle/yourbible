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
