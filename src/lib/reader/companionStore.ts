import { create } from "zustand";

export type CompanionTab = "journal" | "dialogue" | "belief";
export type DockMode = "right" | "left" | "bottom" | "float";

export interface CompanionScope {
  book: string;       // abbr e.g. "Jhn"
  bookName: string;   // "John"
  chapter: number;
  verses: number[];   // empty = whole chapter
  passageText: string; // text of selected verses or chapter excerpt
}

interface PanePos {
  x: number; y: number; w: number; h: number;
  dock: DockMode;
}

interface CompanionState {
  open: boolean;
  minimized: boolean;
  tab: CompanionTab;
  scope: CompanionScope | null;
  /** Persisted journal entry id for the current scope (set after first save). */
  entryId: string | null;
  /** Persisted chat thread id for this scope. */
  threadId: string | null;
  pos: PanePos;

  setOpen: (v: boolean) => void;
  setMinimized: (v: boolean) => void;
  setTab: (t: CompanionTab) => void;
  setScope: (s: CompanionScope | null) => void;
  setEntryId: (id: string | null) => void;
  setThreadId: (id: string | null) => void;
  setPos: (p: Partial<PanePos>) => void;
  openWith: (scope: CompanionScope, tab?: CompanionTab) => void;
}

const POS_KEY = "yb.companion.pos";
function loadPos(): PanePos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) return { ...defaultPos(), ...JSON.parse(raw) };
  } catch { /* */ }
  return defaultPos();
}
function defaultPos(): PanePos {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const w = Math.min(420, Math.floor(vw * 0.36));
  const h = Math.min(640, Math.floor(vh * 0.78));
  return { x: vw - w - 24, y: 80, w, h, dock: "right" };
}
function savePos(p: PanePos) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* */ }
}

export const useCompanion = create<CompanionState>((set, get) => ({
  open: false,
  minimized: false,
  tab: "journal",
  scope: null,
  entryId: null,
  threadId: null,
  pos: typeof window !== "undefined" ? loadPos() : defaultPos(),

  setOpen: (v) => set({ open: v, minimized: false }),
  setMinimized: (v) => set({ minimized: v }),
  setTab: (t) => set({ tab: t }),
  setScope: (s) => {
    const cur = get().scope;
    // If scope key changes, reset thread/entry binding so we don't bleed
    const k = (x: CompanionScope | null) =>
      x ? `${x.book}|${x.chapter}|${x.verses.join(",")}` : "";
    if (k(s) !== k(cur)) set({ entryId: null, threadId: null });
    set({ scope: s });
  },
  setEntryId: (id) => set({ entryId: id }),
  setThreadId: (id) => set({ threadId: id }),
  setPos: (p) => {
    const next = { ...get().pos, ...p };
    savePos(next);
    set({ pos: next });
  },
  openWith: (scope, tab = "journal") => {
    const cur = get().scope;
    const k = (x: CompanionScope | null) =>
      x ? `${x.book}|${x.chapter}|${x.verses.join(",")}` : "";
    if (k(scope) !== k(cur)) set({ entryId: null, threadId: null });
    set({ open: true, minimized: false, tab, scope });
  },
}));

export function scopeRef(s: CompanionScope): string {
  if (!s.verses.length) return `${s.bookName} ${s.chapter}`;
  if (s.verses.length === 1) return `${s.bookName} ${s.chapter}:${s.verses[0]}`;
  return `${s.bookName} ${s.chapter}:${s.verses[0]}-${s.verses[s.verses.length - 1]}`;
}

export function scopeCoreKey(s: CompanionScope): string {
  return `${s.book}-${s.chapter}`;
}