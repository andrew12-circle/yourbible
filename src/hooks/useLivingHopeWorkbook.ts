import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { isLocalModeNotified } from "@/lib/livingHope/livingHopeLocalStore";
import { getOrCreateWorkbook, mergeWorkbookStories, saveWorkbookPatch } from "@/lib/livingHope/workbookApi";
import type { LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";

function changedWorkbookFields(prev: LivingHopeWorkbookContent, next: LivingHopeWorkbookContent): Partial<LivingHopeWorkbookContent> {
  const patch: Partial<LivingHopeWorkbookContent> = {};
  for (const key of Object.keys(next) as Array<keyof LivingHopeWorkbookContent>) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) (patch as Record<string, unknown>)[key] = next[key];
  }
  return patch;
}

type WorkbookSession = {
  owner: string | undefined;
  alive: boolean;
  server: LivingHopeWorkbookContent | null;
  view: LivingHopeWorkbookContent | null;
  pending: Partial<LivingHopeWorkbookContent>;
  timer: ReturnType<typeof setTimeout> | null;
  flight: Promise<void> | null;
};

export function useLivingHopeWorkbook(userId: string | undefined) {
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [workbook, setWorkbookState] = useState<LivingHopeWorkbookContent | null>(null);
  const session = useRef<WorkbookSession>({ owner: undefined, alive: false, server: null, view: null, pending: {}, timer: null, flight: null });

  const flush = useCallback((): Promise<void> => {
    const state = session.current;
    if (!userId || state.owner !== userId || !state.alive) return Promise.resolve();
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    if (state.flight) return state.flight;
    if (!Object.keys(state.pending).length) return Promise.resolve();
    const run = async () => {
      setSaving(true); setSaveError("");
      try {
        while (state.owner === session.current.owner && Object.keys(state.pending).length) {
          const patch = state.pending;
          const submittedView = state.view;
          state.pending = {};
          try {
            const saved = await saveWorkbookPatch(userId, patch, state.server);
            if (state.pending.stories && submittedView) {
              // Edits typed during this request were based on the submitted
              // view. Rebase them before advancing the server baseline, or
              // stale empty metadata could look like an intentional removal.
              state.pending = {
                ...state.pending,
                stories: mergeWorkbookStories(submittedView.stories, state.pending.stories, saved.stories),
              };
            }
            state.server = saved;
            state.view = { ...saved, ...state.pending };
            if (state.alive && state === session.current) setWorkbookState(state.view);
          } catch (cause) {
            state.pending = { ...patch, ...state.pending };
            const message = cause instanceof Error ? cause.message : "Try saving again.";
            if (state.alive && state === session.current) {
              setSaveError(message);
              toast({ title: "Couldn't save workbook", description: message, variant: "destructive" });
            }
            throw cause;
          }
        }
      } finally {
        if (state.alive && state === session.current) setSaving(false);
      }
    };
    state.flight = run().finally(() => { state.flight = null; });
    return state.flight;
  }, [userId]);

  const load = useCallback(async () => {
    const state = session.current;
    if (!userId || state.owner !== userId || !state.alive) return;
    setBusy(true);
    try {
      // Do not let a completed earlier request replace a newer load.
      if (state.flight) await state.flight.catch(() => undefined);
      const loaded = await getOrCreateWorkbook(userId);
      if (!state.alive || state !== session.current) return;
      state.server = loaded;
      state.view = { ...loaded, ...state.pending };
      setWorkbookState(state.view);
      if (isLocalModeNotified()) toast({ title: "Saving on this device", description: "Your workbook is stored locally until the Morning Formula tables are available." });
    } catch (cause) {
      if (state.alive && state === session.current) toast({ title: "Couldn't load workbook", description: cause instanceof Error ? cause.message : "Try again.", variant: "destructive" });
    } finally {
      if (state.alive && state === session.current) setBusy(false);
    }
  }, [userId]);

  useEffect(() => {
    const state: WorkbookSession = { owner: userId, alive: true, server: null, view: null, pending: {}, timer: null, flight: null };
    session.current = state;
    setWorkbookState(null); setSaving(false); setSaveError("");
    if (userId) void load(); else setBusy(false);
    return () => {
      // Start pending writes for this captured owner before detaching the view.
      if (state === session.current && Object.keys(state.pending).length) void flush().catch(() => undefined);
      state.alive = false;
      if (state.timer) clearTimeout(state.timer);
    };
  }, [userId, load, flush]);

  const update = useCallback((patch: Partial<LivingHopeWorkbookContent>) => {
    const state = session.current;
    if (!state.alive || state.owner !== userId || !state.view || !Object.keys(patch).length) return;
    state.pending = { ...state.pending, ...patch };
    state.view = { ...state.view, ...patch };
    setWorkbookState(state.view);
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => { state.timer = null; void flush().catch(() => undefined); }, 700);
  }, [userId, flush]);

  const save = useCallback(async (patch: Partial<LivingHopeWorkbookContent>) => {
    const state = session.current;
    if (!userId || state.owner !== userId || !state.alive || !state.view) throw new Error("Your workbook is not ready. Please try again.");
    const before = { ...state.pending };
    update(patch);
    try {
      await flush();
    } catch (cause) {
      // Explicit editors retain their own draft. Do not silently retry a cancelled
      // editor's failed Save when the user later advances to another activity.
      if (state.alive && state === session.current) {
        const pending = state.pending as Record<string, unknown>;
        for (const key of Object.keys(patch) as Array<keyof LivingHopeWorkbookContent>) {
          if (JSON.stringify(pending[key]) !== JSON.stringify(patch[key])) continue;
          if (Object.prototype.hasOwnProperty.call(before, key)) pending[key] = before[key];
          else delete pending[key];
        }
        state.view = { ...(state.server ?? state.view!), ...state.pending };
        setWorkbookState(state.view);
      }
      throw cause;
    }
    if (!state.alive || state !== session.current) throw new Error("Your account changed before this editor finished saving.");
  }, [userId, update, flush]);

  const setWorkbook = useCallback((next: LivingHopeWorkbookContent) => {
    const previous = session.current.view;
    if (previous) update(changedWorkbookFields(previous, next));
  }, [update]);

  return { busy, saving, saveError, workbook, load, update, setWorkbook, save, flush };
}
