import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Check, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PrayerShell from "@/components/prayer/PrayerShell";
import { JournalVaultUnlockGate } from "@/components/journal/JournalVaultUnlockGate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listBeStillLedger, reviewBeStillLedgerEntry } from "@/lib/prayer/beStillLedger";
import type { BeStillSession, BeStillVerification } from "@/lib/prayer/beStill";

const LABELS: Record<BeStillVerification, string> = {
  pending: "Not reviewed yet",
  confirmed: "Proved true",
  "not-confirmed": "Did not prove true",
  inconclusive: "Inconclusive",
};
type Editing = { id: string; verification: BeStillVerification; notes: string };
function friendlyDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function LedgerEntryCard({ session, edit, onEdit, onCancel, onChange, onSave, saving }: {
  session: BeStillSession;
  edit: Editing | null;
  onEdit: (session: BeStillSession) => void;
  onCancel: () => void;
  onChange: (value: Editing) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const active = edit?.id === session.id;
  return <article className="rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>{friendlyDate(session.startedAt)}</span>
      <span>{LABELS[session.verification]}</span>
    </div>
    <h3 className="mt-3 font-serif text-lg leading-snug">{session.question || "Question not written in the original session"}</h3>
    {(session.place || session.hour) && <p className="mt-2 text-xs text-muted-foreground">Place / hour: {[session.place, session.hour].filter(Boolean).join(" · ")}</p>}
    {session.reflection.trim() ? <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{session.reflection}</p>
      : <p className="mt-3 text-sm italic text-muted-foreground">Nothing clear recorded.</p>}
    {session.thoughtOrigin === "arrived" && <div className="mt-3 space-y-1 text-xs text-muted-foreground">
      {session.qualities.whole && <p>Appeared whole</p>}
      {session.qualities.calm && <p>Came calmly</p>}
      {session.qualities.notFlattering && <p>Did not flatter</p>}
      {session.qualities.challengedWishes && <p>Challenged wishes</p>}
      {session.qualities.asksSomething && <p>Asked something of me</p>}
    </div>}
    {session.reviewDate && <p className="mt-3 text-xs text-muted-foreground">Date to revisit: {session.reviewDate}</p>}
    {session.verificationNotes && !active && <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs leading-relaxed"><span className="font-semibold">Later review: </span>{session.verificationNotes}</div>}
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button size="sm" variant="outline" className="min-h-11 rounded-xl" onClick={() => active ? onCancel() : onEdit(session)}>
        {active ? "Cancel review" : "Mark what proved true"}
      </Button>
      <Link className="inline-flex min-h-11 items-center gap-1 text-xs text-primary underline-offset-4 hover:underline" to={"/journal/" + session.id}>
        <BookOpen className="h-3.5 w-3.5" aria-hidden />Open journal entry
      </Link>
    </div>
    {active && edit && <div className="mt-5 space-y-4 border-t pt-4" role="group" aria-label="Review this observation">
      <div className="space-y-2">
        <Label htmlFor={"review-status-" + session.id}>What later proved true?</Label>
        <select id={"review-status-" + session.id} value={edit.verification}
          onChange={(event) => onChange({ ...edit, verification: event.target.value as BeStillVerification })}
          className="min-h-12 w-full rounded-xl border border-input bg-background px-3 text-sm" disabled={saving}>
          {(Object.entries(LABELS) as [BeStillVerification, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={"review-notes-" + session.id}>Evidence or later observations</Label>
        <Textarea id={"review-notes-" + session.id} rows={4} maxLength={5000} value={edit.notes} disabled={saving}
          onChange={(event) => onChange({ ...edit, notes: event.target.value })}
          placeholder="What actually happened? What remains uncertain?" />
      </div>
      <p className="text-xs text-muted-foreground">The status is your own later assessment, not an automatic judgment about where the thought came from.</p>
      <Button type="button" disabled={saving} onClick={onSave} className="min-h-11">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Check className="mr-2 h-4 w-4" aria-hidden />}
        Save ledger review
      </Button>
    </div>}
  </article>;
}

function LedgerContent({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<BeStillSession[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSessions([]);
    setError(null);
    setOffset(0);
    void listBeStillLedger(userId).then((page) => {
      if (!active) return;
      setSessions(page.sessions);
      setOffset(page.nextOffset);
      setHasMore(page.hasMore);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not open the receiving ledger.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, refresh]);

  const groups = useMemo(() => [
    { kind: "arrived", title: "Thoughts that arrived whole", subtitle: "Appeared complete, without conscious assembly",
      items: sessions.filter((entry) => entry.thoughtOrigin === "arrived") },
    { kind: "reasoned", title: "Ideas built through reasoning", subtitle: "Assembled step by step through deliberate thought",
      items: sessions.filter((entry) => entry.thoughtOrigin === "reasoned") },
  ], [sessions]);
  const unclassified = sessions.filter((entry) => entry.thoughtOrigin === "uncertain" || entry.thoughtOrigin === "none");

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await listBeStillLedger(userId, offset);
      setSessions((old) => [...old, ...page.sessions.filter((row) => !old.some((previous) => previous.id === row.id))]);
      setOffset(page.nextOffset);
      setHasMore(page.hasMore);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load the next page."); }
    finally { setLoadingMore(false); }
  };
  const saveReview = async () => {
    if (!edit || saving) return;
    const { id, verification, notes } = edit;
    setSaving(true);
    setError(null);
    try {
      const saved = await reviewBeStillLedgerEntry(userId, id, verification, notes);
      setSessions((old) => old.map((entry) => entry.id === id ? saved : entry));
      setEdit(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your review was not saved. Please try again."); }
    finally { setSaving(false); }
  };
  const cardProps = (entry: BeStillSession) => ({
    session: entry, edit, saving, onEdit: (session: BeStillSession) => setEdit({
      id: session.id, verification: session.verification, notes: session.verificationNotes,
    }), onCancel: () => setEdit(null), onChange: setEdit, onSave: () => void saveReview(),
  });

  return <div className="mx-auto max-w-6xl space-y-7 pb-8">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Link to="/prayer/be-still" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />Back to Be Still
      </Link>
      <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => setRefresh((value) => value + 1)} disabled={loading || saving}>
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden />Refresh
      </Button>
    </div>
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">On Receiving</p>
      <h2 className="font-serif text-3xl sm:text-4xl">The receiving ledger</h2>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Two sides of the ledger: thoughts built through reasoning and thoughts that appeared whole. Review them over months and mark which proved true. The type of thought is a personal observation, not evidence of divine origin.
      </p>
    </div>
    {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm" role="alert">{error}</div>}
    {loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Opening ledger…</p>
      : sessions.length === 0 ? <div className="rounded-2xl border border-border/70 p-8 text-center">
        <p className="text-lg font-medium">No completed sessions in this ledger yet.</p>
        <p className="mt-2 text-sm text-muted-foreground">Save a Be Still session to begin recording the two kinds of thoughts.</p>
        <Button asChild className="mt-5"><Link to="/prayer/be-still">Begin a session</Link></Button>
      </div> : <>
        <p className="text-xs text-muted-foreground">Showing {sessions.length} loaded sessions. {sessions.filter((s) => s.verification === "confirmed").length} marked proved true; {sessions.filter((s) => s.verification === "not-confirmed").length} marked not true; {sessions.filter((s) => s.verification === "inconclusive").length} inconclusive. These are your recorded assessments.</p>
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {groups.map((group) => <section key={group.kind} aria-label={group.title} className="space-y-4">
            <div className="rounded-2xl bg-muted/40 p-4">
              <h3 className="font-serif text-xl">{group.title} <span className="text-sm font-normal text-muted-foreground">({group.items.length})</span></h3>
              <p className="mt-1 text-xs text-muted-foreground">{group.subtitle}</p>
            </div>
            {group.items.length ? group.items.map((entry) => <LedgerEntryCard key={entry.id} {...cardProps(entry)} />)
              : <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">No observations recorded on this side yet.</p>}
          </section>)}
        </div>
        {unclassified.length > 0 && <section className="space-y-3">
          <h3 className="font-serif text-xl">Uncertain or nothing clear ({unclassified.length})</h3>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {unclassified.map((entry) => <LedgerEntryCard key={entry.id} {...cardProps(entry)} />)}
          </div>
        </section>}
        {hasMore && <div className="flex justify-center">
          <Button type="button" variant="outline" className="min-h-12" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Load older sessions
          </Button>
        </div>}
      </>}
  </div>;
}

export default function BeStillLedgerPage() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status" className="p-6 text-muted-foreground">Opening the receiving ledger…</p>;
  if (!user) return <Navigate to="/auth" replace />;
  return <PrayerShell title="Receiving ledger" hideTabs wide>
    <JournalVaultUnlockGate><LedgerContent key={user.id} userId={user.id} /></JournalVaultUnlockGate>
  </PrayerShell>;
}
