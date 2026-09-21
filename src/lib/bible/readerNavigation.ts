/** Location state when opening the Bible reader from another flow (e.g. Morning formula). */

export interface ReaderNavigationState {
  dailyPrompt?: string;
  dailyReason?: string;
  returnTo?: string;
  returnLabel?: string;
}

export const MORNING_FORMULA_SCRIPTURE_RETURN = "/living-hope/review?step=scripture";
export const MORNING_FORMULA_WORSHIP_RETURN = "/living-hope/review?step=worship";
export const MORNING_FORMULA_CONVERSATION_RETURN = "/living-hope/review?step=conversation";

const SESSION_KEY = "yb_reader_return";

export function morningFormulaReaderState(opts?: {
  prompt?: string;
  reason?: string;
}): ReaderNavigationState {
  return {
    dailyPrompt: opts?.prompt,
    dailyReason: opts?.reason,
    returnTo: MORNING_FORMULA_SCRIPTURE_RETURN,
    returnLabel: "Return to Morning Formula",
  };
}

export function persistReaderReturn(state: ReaderNavigationState): void {
  if (typeof window === "undefined" || !state.returnTo) return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ to: state.returnTo, label: state.returnLabel ?? "Back" }));
  } catch { /* The URL still carries the return destination. */ }
}

export function readReaderReturn(): { to: string; label: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { to?: string; label?: string };
    if (!parsed.to) return null;
    return { to: parsed.to, label: parsed.label ?? "Back" };
  } catch {
    return null;
  }
}

export function clearReaderReturn(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function readerReturnFromState(state: unknown): { to: string; label: string } | null {
  if (typeof window !== "undefined") {
    const query = new URLSearchParams(window.location.search);
    if (query.get("returnTo") === MORNING_FORMULA_SCRIPTURE_RETURN) {
      return { to: MORNING_FORMULA_SCRIPTURE_RETURN, label: "Return to Morning Formula" };
    }
  }
  const s = state as ReaderNavigationState | null;
  if (s?.returnTo) {
    return { to: s.returnTo, label: s.returnLabel ?? "Back" };
  }
  return readReaderReturn();
}

/** Portable reader link; never depends on opener storage or a React history entry. */
export function morningFormulaReaderHref(readerHref: string, popout = false): string {
  const href = readerHref.startsWith("/") && !readerHref.startsWith("//") && !readerHref.includes("\\") ? readerHref : "/reader";
  const url = new URL(href, "https://yourbible.invalid");
  url.searchParams.set("returnTo", MORNING_FORMULA_SCRIPTURE_RETURN);
  if (popout) url.searchParams.set("formulaPopout", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}
