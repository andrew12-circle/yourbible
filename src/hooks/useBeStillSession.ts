import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createBeStillSession,
  parseBeStillSession,
  serializeBeStillSession,
  type BeStillEntryPoint,
  type BeStillSession,
} from "@/lib/prayer/beStill";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { journalEncryptionRequired } from "@/lib/journal/journalEntryDb";
import { journalEntryWasDeleted } from "@/lib/journal/journalDraftStorage";
import { createLocalJournalDocument, openJournalDocument } from "@/lib/journal/journalDocuments";
import type { JournalSaveQueue } from "@/lib/journal/journalSaveQueue";
import { localDateKey } from "@/lib/journal/localDate";
import { useJournalVaultStore } from "@/stores/journalVaultStore";

const DRAFT_TAG = "be-still-draft";
const SAVED_TAGS = ["be-still", "listening-prayer"];
const editableFields = ["stage", "question", "picture", "reflection", "scripture", "nextStep", "reviewDate", "outcome"] as const;
const pointerKey = (userId: string) => `yb_be_still_active_v1:${userId}`;
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const message = (cause: unknown) => cause instanceof Error ? cause.message : "Your session could not be saved. Please try again.";
type Scope = { userId: string; generation: number; lockEpoch: number };
type View = {
  userId: string;
  session: BeStillSession | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  draftStatus: "saved" | "saving" | "error";
  completed: boolean;
};
const emptyView = (userId: string): View => ({ userId, session: null, loading: true, busy: false, error: null, draftStatus: "saved", completed: false });

function clearPointer(userId: string, id: string): void {
  // Never erase a different session started in another tab.
  if (localStorage.getItem(pointerKey(userId)) === id) localStorage.removeItem(pointerKey(userId));
}

async function assertAccount(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session?.user.id !== userId) throw new Error("Sign in to the account that owns this prayer session.");
}

/** Reuse the journal's protected local drafts; cloud saving begins only on completion. */
export function useBeStillSession(userId: string, entryPoint: BeStillEntryPoint, resumeId?: string) {
  const lockEpoch = useJournalVaultStore((state) => state.lockEpoch);
  const locking = useJournalVaultStore((state) => state.locking);
  const [view, setView] = useState<View>(() => emptyView(userId));
  const [reload, setReload] = useState(0);
  const contextKey = `${userId}:${lockEpoch}:${resumeId ?? ""}:${reload}`;
  const userRef = useRef(userId);
  userRef.current = userId;
  const generation = useRef(0);
  const renderContext = useRef(contextKey);
  const viewContext = useRef(contextKey);
  if (renderContext.current !== contextKey) {
    renderContext.current = contextKey;
    generation.current += 1;
  }
  const mounted = useRef(false);
  const queueRef = useRef<JournalSaveQueue | null>(null);
  const sessionRef = useRef<BeStillSession | null>(null);
  const completedRef = useRef(false);
  const blockedRecovery = useRef(false);
  const operation = useRef<symbol | null>(null);
  const unsubscribe = useRef<(() => void) | null>(null);

  const current = useCallback((scope: Scope) => mounted.current && userRef.current === scope.userId &&
    generation.current === scope.generation && useJournalVaultStore.getState().lockEpoch === scope.lockEpoch &&
    !useJournalVaultStore.getState().locking, []);

  const attach = useCallback((scope: Scope, queue: JournalSaveQueue, session: BeStillSession) => {
    if (!current(scope)) return;
    unsubscribe.current?.();
    queueRef.current = queue;
    sessionRef.current = session;
    const publish = () => {
      if (!current(scope) || queueRef.current !== queue) return;
      const state = queue.getState();
      const failed = state.status === "error" || state.status === "conflict";
      const acknowledged = Boolean(sessionRef.current?.completedAt && state.snapshot.revision !== null &&
        !queue.isDirty() && state.status === "saved" && state.durable);
      if (acknowledged) {
        completedRef.current = true;
        try { clearPointer(scope.userId, state.snapshot.id); } catch { /* A future resume verifies the saved revision. */ }
      }
      setView((previous) => ({
        ...previous, userId: scope.userId, session: sessionRef.current, loading: false,
        draftStatus: failed ? "error" : state.durable ? "saved" : "saving",
        completed: previous.completed || acknowledged,
        error: acknowledged ? null : failed ? state.error : previous.error,
      }));
    };
    unsubscribe.current = queue.subscribe(publish);
    publish();
  }, [current]);

  useEffect(() => {
    mounted.current = true;
    viewContext.current = contextKey;
    const scope: Scope = { userId, generation: ++generation.current, lockEpoch };
    queueRef.current = null;
    sessionRef.current = null;
    completedRef.current = false;
    blockedRecovery.current = false;
    operation.current = null;
    setView(emptyView(userId));
    void (async () => {
      try {
        const id = resumeId ?? localStorage.getItem(pointerKey(userId));
        if (!id) return;
        if (!isUuid(id)) {
          if (resumeId) throw new Error("This prayer session link is invalid.");
          clearPointer(userId, id); return;
        }
        if (await journalEntryWasDeleted(userId, id)) { clearPointer(userId, id); return; }
        const queue = await openJournalDocument(userId, id);
        if (!current(scope)) return;
        const snapshot = queue.current();
        const session = parseBeStillSession(String(snapshot.values.body ?? ""));
        if (!session || session.id !== id || snapshot.userId !== userId) {
          throw new Error("This saved prayer session could not be read. It has been kept in Journal recovery.");
        }
        if (resumeId) localStorage.setItem(pointerKey(userId), id);
        attach(scope, queue, session);
        if (session.completedAt && snapshot.revision !== null && !queue.isDirty()) {
          completedRef.current = true;
          clearPointer(userId, id);
          setView((previous) => ({ ...previous, completed: true }));
        }
      } catch (cause) {
        if (current(scope)) {
          blockedRecovery.current = true;
          setView((previous) => ({ ...previous, error: message(cause), draftStatus: "error" }));
        }
      } finally {
        if (current(scope)) setView((previous) => ({ ...previous, loading: false }));
      }
    })();
    return () => {
      mounted.current = false;
      generation.current += 1;
      unsubscribe.current?.();
      unsubscribe.current = null;
      queueRef.current = null;
      sessionRef.current = null;
    };
  }, [userId, lockEpoch, contextKey, resumeId, current, attach]);

  const start = useCallback(async () => {
    if (operation.current || !mounted.current || blockedRecovery.current || (sessionRef.current && !completedRef.current)) return;
    const scope: Scope = { userId, generation: generation.current, lockEpoch: useJournalVaultStore.getState().lockEpoch };
    if (!current(scope)) return;
    const token = Symbol("start");
    operation.current = token;
    setView((previous) => ({ ...previous, busy: true, error: null }));
    let newId: string | null = null;
    let created = false;
    try {
      await assertAccount(userId);
      const journalId = await getDefaultJournalId(userId);
      const encrypted = await journalEncryptionRequired(userId, journalId);
      await assertAccount(userId);
      if (!current(scope)) return;
      const session = createBeStillSession(entryPoint);
      newId = session.id;
      localStorage.setItem(pointerKey(userId), session.id);
      const queue = createLocalJournalDocument(userId, session.id, {
        journal_id: journalId, entry_kind: null, title: "Be Still", summary: null,
        body: serializeBeStillSession(session), tags: [...SAVED_TAGS, DRAFT_TAG], analyze_for_mirror: false,
        entry_at_ts: session.startedAt, entry_at: localDateKey(new Date(session.startedAt)),
      }, encrypted);
      created = true;
      completedRef.current = false;
      attach(scope, queue, session);
      setView((previous) => ({ ...previous, completed: false }));
      await queue.persist();
    } catch (cause) {
      if (!created && newId) { try { clearPointer(userId, newId); } catch { /* Keep the recovery pointer if storage is unavailable. */ } }
      if (current(scope)) setView((previous) => ({ ...previous, error: message(cause), draftStatus: "error" }));
    } finally {
      if (operation.current === token) operation.current = null;
      if (current(scope)) setView((previous) => ({ ...previous, busy: false }));
    }
  }, [userId, entryPoint, current, attach]);

  const update = useCallback((patch: Partial<BeStillSession>) => {
    const scope: Scope = { userId, generation: generation.current, lockEpoch: useJournalVaultStore.getState().lockEpoch };
    const queue = queueRef.current;
    const session = sessionRef.current;
    if (!current(scope) || !queue || !session || completedRef.current || operation.current) return;
    try {
      const allowed = Object.fromEntries(editableFields.filter((key) => patch[key] !== undefined).map((key) => [key, patch[key]]));
      const next: BeStillSession = { ...session, ...allowed, completedAt: null };
      sessionRef.current = next;
      queue.patch({ body: serializeBeStillSession(next), tags: [...SAVED_TAGS, DRAFT_TAG] });
      setView((previous) => ({ ...previous, session: next, error: null }));
      void queue.persist().catch((cause) => {
        if (current(scope)) setView((previous) => ({ ...previous, error: message(cause), draftStatus: "error" }));
      });
    } catch (cause) {
      if (current(scope)) setView((previous) => ({ ...previous, error: message(cause), draftStatus: "error" }));
    }
  }, [userId, current]);

  const complete = useCallback(async () => {
    const scope: Scope = { userId, generation: generation.current, lockEpoch: useJournalVaultStore.getState().lockEpoch };
    const queue = queueRef.current;
    const session = sessionRef.current;
    if (!current(scope) || !queue || !session || operation.current || completedRef.current) return;
    const token = Symbol("complete");
    operation.current = token;
    setView((previous) => ({ ...previous, busy: true, error: null }));
    try {
      const finished: BeStillSession = { ...session, stage: "reflect", completedAt: session.completedAt ?? new Date().toISOString() };
      sessionRef.current = finished;
      queue.patch({ body: serializeBeStillSession(finished), tags: [...SAVED_TAGS] });
      setView((previous) => ({ ...previous, session: finished }));
      const result = await queue.flush();
      if (result.ok === false) throw result.error;
      if (!current(scope)) return;
      completedRef.current = true;
      // Cleanup failure must not turn an acknowledged save into a false failure.
      try { clearPointer(userId, session.id); } catch { /* Recovery verifies the acknowledged revision before showing completion. */ }
      setView((previous) => ({ ...previous, completed: true, draftStatus: "saved", error: null }));
    } catch (cause) {
      if (current(scope)) setView((previous) => ({ ...previous, error: message(cause), draftStatus: "error" }));
    } finally {
      if (operation.current === token) operation.current = null;
      if (current(scope)) setView((previous) => ({ ...previous, busy: false }));
    }
  }, [userId, current]);

  const retry = useCallback(async () => {
    if (operation.current) return;
    if (sessionRef.current?.completedAt) { await complete(); return; }
    const queue = queueRef.current;
    if (!queue || blockedRecovery.current) { setReload((value) => value + 1); return; }
    const scope: Scope = { userId, generation: generation.current, lockEpoch: useJournalVaultStore.getState().lockEpoch };
    if (!current(scope)) return;
    setView((previous) => ({ ...previous, error: null, draftStatus: "saving" }));
    try {
      localStorage.setItem(pointerKey(userId), queue.current().id);
      await queue.persist();
      if (current(scope)) setView((previous) => ({ ...previous, draftStatus: "saved", error: null }));
    } catch (cause) {
      if (current(scope)) setView((previous) => ({ ...previous, error: message(cause), draftStatus: "error" }));
    }
  }, [userId, complete, current]);

  const visible = view.userId === userId && viewContext.current === contextKey && !locking ? view : emptyView(userId);
  return { ...visible, start, update, complete, retry };
}
