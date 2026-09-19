import { useCallback, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JOURNAL_DOCUMENT_CHANGED, peekJournalDocument, flushJournalDocument } from "@/lib/journal/journalDocuments";
import type { JournalValues } from "@/lib/journal/journalSaveQueue";

export function JournalSaveStatus({ userId, entryId }: {
  userId?: string; entryId?: string | null;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [review, setReview] = useState<JournalValues>({});
  const [resolving, setResolving] = useState(false);
  const subscribe = useCallback((listener: () => void) => {
    const change = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; entryId: string }>).detail;
      if (detail?.userId === userId && detail.entryId === entryId) listener();
    };
    window.addEventListener(JOURNAL_DOCUMENT_CHANGED, change);
    return () => window.removeEventListener(JOURNAL_DOCUMENT_CHANGED, change);
  }, [userId, entryId]);
  const getState = useCallback(() => userId && entryId ? peekJournalDocument(userId, entryId)?.getState() : undefined, [userId, entryId]);
  const state = useSyncExternalStore(subscribe, getState, () => undefined);
  const needsAttention = state?.status === "error" || state?.status === "conflict";
  // Normal autosave is silent and occupies no space above the toolbar. Keep
  // actionable failures and conflict recovery available. Speech belongs in the body.
  if (!state || !userId || !entryId || !needsAttention) return null;
  const queue = peekJournalDocument(userId, entryId)!;
  const label = state.status === "conflict" ? "Changes need review — your local copy is retained"
    : state.durable ? "Cloud save needs attention — your local copy is retained" : "Not saved — keep this entry open";
  const remote = state.status === "conflict" ? queue.getRemoteConflict() : null;
  return (
    <div className="shrink-0 px-4 py-1 text-xs text-muted-foreground" data-journal-save-status>
      {needsAttention && <div className="flex flex-wrap items-center gap-2">
        <span role="status" aria-live="polite">{label}</span>
        {state.status === "error" && <Button size="sm" variant="ghost" onClick={() => void flushJournalDocument(userId, entryId)}>Retry save</Button>}
        {state.status === "conflict" && <Button size="sm" variant="outline" onClick={() => {
          setReview(Object.fromEntries(state.conflicts.map((key) => [key, state.snapshot.values[key]])));
          setReviewOpen(true);
        }}>Review both versions</Button>}
      </div>}
      {needsAttention && state.error && state.status !== "conflict" && <p className="mt-1" role="alert">{state.error}</p>}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Review journal changes</DialogTitle></DialogHeader>
          <p className="text-sm">Another save changed this entry. Edit the local value below or choose the cloud value. Nothing is overwritten until you save your reviewed changes.</p>
          {state.conflicts.map((key) => (
            <section key={key} className="space-y-2 rounded border p-3">
              <h3 className="font-semibold capitalize">{key.replaceAll("_", " ")}</h3>
              <p className="text-xs">Cloud value</p>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-sm">{typeof remote?.values[key] === "string" ? remote.values[key] as string : JSON.stringify(remote?.values[key])}</pre>
              <Button variant="outline" size="sm" onClick={() => setReview((value) => ({ ...value, [key]: remote?.values[key] }))}>Use cloud value</Button>
              <p className="text-xs">Value to save</p>
              {["title", "body", "summary", "location_name", "verse_ref"].includes(key) ? (
                <textarea aria-label={`Reviewed ${key}`} className="min-h-24 w-full rounded border bg-background p-2 text-sm"
                  value={String(review[key] ?? "")} onChange={(event) => setReview((value) => ({ ...value, [key]: event.target.value || (key === "body" ? "" : null) }))} />
              ) : <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(review[key])}</pre>}
            </section>
          ))}
          <Button disabled={resolving} onClick={async () => {
            setResolving(true);
            try {
              const result = await queue.resolveConflict(review);
              if (result.ok) setReviewOpen(false);
            } finally { setResolving(false); }
          }}>{resolving ? "Saving…" : "Save reviewed changes"}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
