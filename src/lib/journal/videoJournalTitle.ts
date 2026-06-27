import {
  entryFallbackTitle,
  isPlaceholderJournalTitle,
  isVideoJournalStampTitle,
} from "@/lib/journal/entryDisplay";

const MIN_BODY_TITLE_CHARS = 12;

/** Default title when a video journal clip starts — stamped with entry time. */
export function formatVideoJournalStamp(at: Date = new Date()): string {
  const datePart = at.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timePart = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `Video journal · ${datePart} · ${timePart}`;
}

export function deriveVideoJournalTitleFromBody(body: string): string {
  const fallback = entryFallbackTitle(body);
  if (fallback.length < MIN_BODY_TITLE_CHARS) return "";
  return fallback.slice(0, 80);
}

export function canAutoManageVideoJournalTitle(title: string | null | undefined): boolean {
  const t = title?.trim() ?? "";
  return isPlaceholderJournalTitle(t) || isVideoJournalStampTitle(t);
}

/** Pick the next auto title while live transcript grows. */
export function pickLiveVideoJournalTitle(
  currentTitle: string,
  body: string,
  stamp: string,
): string | null {
  const current = currentTitle.trim();
  const fromBody = deriveVideoJournalTitleFromBody(body);

  if (fromBody) {
    if (canAutoManageVideoJournalTitle(current)) {
      return fromBody !== current ? fromBody : null;
    }
    if (fromBody.length > current.length && fromBody.startsWith(current.replace(/\.\.\.$/, ""))) {
      return fromBody;
    }
  }

  if (isPlaceholderJournalTitle(current) && stamp !== current) {
    return stamp;
  }

  return null;
}
