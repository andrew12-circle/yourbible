import { mergeJournalText } from "./journalTextMerge";

/** A journal write stays pending until its exact snapshot is acknowledged. */
export type JournalValues = Record<string, unknown>;
export type JournalSnapshot = {
  id: string;
  userId: string;
  revision: number | null;
  values: JournalValues;
  encrypted: boolean;
};
export type JournalPendingDraft = {
  version: 1;
  base: JournalSnapshot;
  pending: JournalValues;
  updatedAt: string;
};
export type JournalSaveState = {
  status: "saved" | "pending" | "saving" | "error" | "conflict";
  durable: boolean;
  error: string | null;
  conflicts: string[];
  snapshot: JournalSnapshot;
};
export class JournalConflictError extends Error {
  readonly code = "JOURNAL_CONFLICT";
  constructor(message = "This entry changed elsewhere. Your local changes have been kept.") {
    super(message);
    this.name = "JournalConflictError";
  }
}
export type JournalFlushResult =
  | { ok: true; entryId: string; snapshot: JournalSnapshot }
  | { ok: false; entryId: string; error: Error };
export type JournalSaveDependencies = {
  write: (base: JournalSnapshot, patch: JournalValues) => Promise<JournalSnapshot>;
  read: () => Promise<JournalSnapshot>;
  persist: (draft: JournalPendingDraft | null) => Promise<void>;
};

export function journalValueEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function journalChangedFields(before: JournalValues, after: JournalValues): JournalValues {
  return Object.fromEntries(Object.keys(after)
    .filter((key) => !journalValueEqual(before[key], after[key]))
    .map((key) => [key, after[key]]));
}

/** Merge independent fields only. Conflicting prose must never be guessed or overwritten. */
export function reconcileJournalPatch(
  base: JournalValues,
  local: JournalValues,
  remote: JournalValues,
): { patch: JournalValues; conflicts: string[] } {
  const patch: JournalValues = {};
  const conflicts: string[] = [];
  for (const [key, value] of Object.entries(local)) {
    if (journalValueEqual(remote[key], value)) continue;
    patch[key] = value;
    if (!journalValueEqual(remote[key], base[key])) {
      const old = base[key];
      const incoming = remote[key];
      if (key === "body" && typeof old === "string" && typeof value === "string" && typeof incoming === "string") {
        const merged = mergeJournalText(old, value, incoming);
        if (merged !== null) { patch[key] = merged; continue; }
      }
      conflicts.push(key);
    }
  }
  return { patch, conflicts };
}

/**
 * Framework-independent so mobile, desktop, recovery, and tests use the same rules.
 * The owner keeps this instance alive after a React editor unmounts. Persistence
 * operations are serialized too: an old acknowledgement cannot delete a new draft.
 */
export class JournalSaveQueue {
  private base: JournalSnapshot;
  private pending: JournalValues;
  private mutation = 0;
  private durableMutation = -1;
  private chain: Promise<void> = Promise.resolve();
  private flight: Promise<JournalFlushResult> | null = null;
  private listeners = new Set<() => void>();
  private remoteConflict: JournalSnapshot | null = null;
  private state: JournalSaveState;
  private readonly deps: JournalSaveDependencies;

  constructor(base: JournalSnapshot, deps: JournalSaveDependencies, pending: JournalValues = {}) {
    this.deps = deps;
    this.base = structuredClone(base);
    this.pending = structuredClone(pending);
    this.state = {
      status: this.isDirty() ? "pending" : "saved",
      durable: !this.isDirty(), error: null, conflicts: [], snapshot: this.current(),
    };
  }

  current = (): JournalSnapshot => ({
    ...this.base, values: structuredClone({ ...this.base.values, ...this.pending }),
  });
  getState = (): JournalSaveState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  isDirty = (): boolean => this.base.revision === null || Object.keys(this.pending).length > 0;

  private emit(patch: Partial<JournalSaveState> = {}) {
    this.state = { ...this.state, ...patch, snapshot: this.current() };
    for (const listener of this.listeners) {
      try { listener(); } catch (error) { console.error("Journal view listener failed", error); }
    }
  }

  patch = (patch: JournalValues): void => {
    const next = { ...this.pending };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) throw new Error(`Cannot persist an undefined journal field: ${key}`);
      // Keep a return-to-base edit while an older write is in flight.
      if (!this.flight && journalValueEqual(this.base.values[key], value)) delete next[key];
      else next[key] = structuredClone(value);
    }
    if (journalValueEqual(next, this.pending)) return;
    this.pending = next;
    this.mutation += 1;
    this.emit({ status: this.remoteConflict ? "conflict" : "pending", durable: false, error: null });
    // Deliberately handled here; flush also checks the durable write result.
    void this.persist().catch(() => {});
  };

  /** Also used before navigation; failures are visible and retain the in-memory copy. */
  persist = (): Promise<void> => {
    const mutation = this.mutation;
    const draft: JournalPendingDraft | null = this.isDirty() ? {
      version: 1, base: structuredClone(this.base), pending: structuredClone(this.pending),
      updatedAt: new Date().toISOString(),
    } : null;
    const task = this.chain.catch(() => {}).then(async () => {
      await this.deps.persist(draft);
      if (mutation === this.mutation) {
        this.durableMutation = mutation;
        this.emit({ durable: true });
      }
    });
    this.chain = task;
    return task.catch((error: unknown) => {
      if (mutation === this.mutation) this.emit({
        durable: false, error: error instanceof Error ? error.message : String(error), status: "error",
      });
      throw error;
    });
  };

  /** Fetching another version never destroys an unacknowledged local patch. */
  acceptRemote = (remote: JournalSnapshot): boolean => {
    if (remote.id !== this.base.id || remote.userId !== this.base.userId) {
      throw new Error("Journal response belongs to another entry or account.");
    }
    if (this.base.revision !== null && remote.revision !== null && remote.revision < this.base.revision) return false;
    const result = reconcileJournalPatch(this.base.values, this.pending, remote.values);
    if (result.conflicts.length) {
      this.remoteConflict = structuredClone(remote);
      this.emit({ status: "conflict", conflicts: result.conflicts, error: new JournalConflictError().message });
      return false;
    }
    this.base = structuredClone(remote);
    this.pending = result.patch;
    this.remoteConflict = null;
    this.mutation += 1;
    this.emit({ status: this.isDirty() ? "pending" : "saved", conflicts: [], error: null, durable: false });
    return true;
  };

  /** Explicit user resolution only; automatic retry must never call this. */
  resolveConflict = async (merged: JournalValues): Promise<JournalFlushResult> => {
    if (!this.remoteConflict) return this.flush();
    const remote = this.remoteConflict;
    const preserved = reconcileJournalPatch(this.base.values, this.pending, remote.values);
    this.base = structuredClone(remote);
    this.pending = journalChangedFields(remote.values, { ...remote.values, ...preserved.patch, ...merged });
    this.remoteConflict = null;
    this.mutation += 1;
    this.emit({ status: "pending", conflicts: [], error: null, durable: false });
    return this.flush();
  };

  getRemoteConflict = (): JournalSnapshot | null => this.remoteConflict && structuredClone(this.remoteConflict);

  flush = (): Promise<JournalFlushResult> => {
    if (this.flight) return this.flight;
    const run = async (): Promise<JournalFlushResult> => {
      try {
        if (this.remoteConflict) throw new JournalConflictError();
        for (let attempt = 0; attempt < 8; attempt += 1) {
          await this.persist();
          if (!this.isDirty()) {
            this.emit({ status: "saved", error: null });
            return { ok: true, entryId: this.base.id, snapshot: this.current() };
          }
          const base = structuredClone(this.base);
          const sent = structuredClone(this.pending);
          this.emit({ status: "saving", error: null });
          let saved: JournalSnapshot;
          try {
            saved = await this.deps.write(base, sent);
          } catch (error) {
            if (!(error instanceof JournalConflictError)) throw error;
            const remote = await this.deps.read();
            if (!this.acceptRemote(remote)) throw error;
            continue;
          }
          if (saved.id !== base.id || saved.userId !== base.userId || saved.revision === null) {
            throw new Error("The server did not acknowledge this journal entry.");
          }
          // A newer edit to a sent key remains pending, including edits back to the old base.
          for (const key of Object.keys(sent)) {
            if (journalValueEqual(this.pending[key], sent[key])) delete this.pending[key];
          }
          this.base = structuredClone(saved);
          // Remove no-op patches against the actual acknowledged row.
          for (const key of Object.keys(this.pending)) {
            if (journalValueEqual(this.pending[key], saved.values[key])) delete this.pending[key];
          }
          this.mutation += 1;
          this.emit({ status: this.isDirty() ? "pending" : "saved", durable: false });
        }
        throw new Error("Edits are still arriving. Your changes remain pending; try saving again.");
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        this.emit({ status: error instanceof JournalConflictError ? "conflict" : "error", error: error.message,
          durable: this.durableMutation === this.mutation });
        return { ok: false, entryId: this.base.id, error };
      }
    };
    const flight = run().finally(() => { if (this.flight === flight) this.flight = null; });
    this.flight = flight;
    return flight;
  };
}
