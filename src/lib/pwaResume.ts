export const PWA_RESUME_STORAGE_KEY = "yb.pwa.resume.v1";
export const PWA_RESUME_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export type PwaResumeSnapshot = {
  url: string;
  scrollX: number;
  scrollY: number;
  savedAt: number;
};

const RESUME_BLOCKED_PATH_PREFIXES = ["/auth", "/onboarding", "/privacy", "/terms"];
const RESUME_URL_BASE = "https://belief-architecture.local";

export function buildPwaResumeUrl(pathname: string, search = "", hash = ""): string {
  return `${pathname || "/"}${search}${hash}`;
}

export function isPwaResumeLaunchUrl(pathname: string, search = "", hash = ""): boolean {
  return (pathname || "/") === "/" && !search && !hash;
}

export function isStandalonePwa(win: Pick<Window, "matchMedia" | "navigator"> = window): boolean {
  const navigatorWithStandalone = win.navigator as Navigator & { standalone?: boolean };
  if (navigatorWithStandalone.standalone === true) return true;
  return win.matchMedia?.("(display-mode: standalone)").matches === true;
}

export function createPwaResumeSnapshot(
  url: string,
  scrollX = 0,
  scrollY = 0,
  savedAt = Date.now(),
): PwaResumeSnapshot {
  return {
    url,
    scrollX: normalizeScrollPosition(scrollX),
    scrollY: normalizeScrollPosition(scrollY),
    savedAt,
  };
}

export function shouldStorePwaResumeUrl(url: string): boolean {
  const parsed = parseResumeUrl(url);
  if (!parsed) return false;
  if (parsed.pathname === "/") return false;
  return !RESUME_BLOCKED_PATH_PREFIXES.some(
    (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
  );
}

export function savePwaResumeSnapshot(storage: Storage, snapshot: PwaResumeSnapshot): boolean {
  if (!isValidPwaResumeSnapshot(snapshot)) return false;

  try {
    storage.setItem(PWA_RESUME_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function readPwaResumeSnapshot(storage: Storage, now = Date.now()): PwaResumeSnapshot | null {
  let raw: string | null = null;

  try {
    raw = storage.getItem(PWA_RESUME_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    const snapshot = JSON.parse(raw) as PwaResumeSnapshot;
    if (!isValidPwaResumeSnapshot(snapshot) || now - snapshot.savedAt > PWA_RESUME_MAX_AGE_MS) {
      storage.removeItem(PWA_RESUME_STORAGE_KEY);
      return null;
    }
    return snapshot;
  } catch {
    storage.removeItem(PWA_RESUME_STORAGE_KEY);
    return null;
  }
}

function isValidPwaResumeSnapshot(snapshot: PwaResumeSnapshot): snapshot is PwaResumeSnapshot {
  return (
    snapshot != null &&
    shouldStorePwaResumeUrl(snapshot.url) &&
    Number.isFinite(snapshot.scrollX) &&
    Number.isFinite(snapshot.scrollY) &&
    Number.isFinite(snapshot.savedAt)
  );
}

function parseResumeUrl(url: string): URL | null {
  if (!url.startsWith("/") || url.startsWith("//")) return null;

  try {
    const parsed = new URL(url, RESUME_URL_BASE);
    if (parsed.origin !== RESUME_URL_BASE) return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizeScrollPosition(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}
