import {
  ENTRY_KIND_META,
  type JournalEntryKind,
} from "@/lib/journal/entryKinds";
import { isListeningEmpty, type ListeningSections } from "@/lib/journal/listeningEntry";

export type ComposeEntryDraft = {
  title: string;
  body: string;
  tags: string[];
  listeningSections?: ListeningSections;
  entryKind?: JournalEntryKind | null;
  updatedAt: number;
};

const DRAFT_PREFIX = "yb_journal_compose_draft_v1_";

export function composeDraftStorageKey(
  userId: string,
  editId: string | undefined,
  entryKind: JournalEntryKind | null,
) {
  const suffix = editId ?? `new:${entryKind ?? "plain"}`;
  return `${DRAFT_PREFIX}${userId}_${suffix}`;
}

export function loadComposeEntryDraft(key: string): ComposeEntryDraft | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ComposeEntryDraft>;
    if (typeof parsed.body !== "string") return null;
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      body: parsed.body,
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t) => typeof t === "string") : [],
      listeningSections: parsed.listeningSections,
      entryKind: parsed.entryKind ?? null,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveComposeEntryDraft(key: string, draft: Omit<ComposeEntryDraft, "updatedAt">) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ ...draft, updatedAt: Date.now() } satisfies ComposeEntryDraft),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearComposeEntryDraft(key: string) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** True when the user has written something beyond auto-inserted placeholders. */
export function hasMeaningfulComposeContent(opts: {
  title: string;
  body: string;
  entryKind?: JournalEntryKind | null;
  listeningSections?: ListeningSections;
}): boolean {
  if (opts.title.trim()) return true;
  if (opts.listeningSections && !isListeningEmpty(opts.listeningSections)) return true;
  const body = opts.body.trim();
  if (!body) return false;
  if (opts.entryKind) {
    const placeholder = ENTRY_KIND_META[opts.entryKind].placeholder.trim();
    if (body === placeholder) return false;
  }
  return true;
}
