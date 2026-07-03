import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2, Link2, PartyPopper, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PrayerShell from "@/components/prayer/PrayerShell";
import PrayerRequestStatusBadge from "@/components/prayer/PrayerRequestStatusBadge";
import PrayerRequestForm from "@/components/prayer/PrayerRequestForm";
import PrayerTimelineView from "@/components/prayer/PrayerTimelineView";
import PrayerLinkPicker from "@/components/prayer/PrayerLinkPicker";
import PrayerAnswerFieldsSection from "@/components/prayer/PrayerAnswerFieldsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { usePrayerRequestDetail } from "@/hooks/usePrayerRequestDetail";
import { deletePrayerRequest, updatePrayerRequest } from "@/lib/prayer/api";
import { PRAYER_STATUSES, PRAYER_STATUS_LABELS, CELEBRATION_STATUSES } from "@/lib/prayer/statuses";
import { PRAYER_CATEGORY_LABELS } from "@/lib/prayer/categories";
import { formatDisplayDate } from "@/lib/prayer/stats";
import { formatLedgerAmount, parseLedgerAmount } from "@/lib/prayer/money";
import { mergeScriptureDisplay } from "@/lib/prayer/scriptureDisplay";
import { localDateISO } from "@/lib/habits/dates";
import type { PrayerRequestStatus } from "@/lib/prayer/types";

export default function PrayerRequestDetailPage() {
  const { user, loading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [showPartialForm, setShowPartialForm] = useState(false);
  const [partialAnsweredAt, setPartialAnsweredAt] = useState("");
  const [partialAmount, setPartialAmount] = useState("");
  const [partialStory, setPartialStory] = useState("");
  const [editAnsweredAt, setEditAnsweredAt] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editStory, setEditStory] = useState("");

  const {
    request,
    events,
    loading: detailLoading,
    reload,
    addEvent,
    linkJournalEntry,
    linkArtifact,
    linkVerse,
  } = usePrayerRequestDetail(user?.id, id);

  useEffect(() => {
    if (!request) return;
    setEditAnsweredAt(request.answered_at ?? "");
    setEditAmount(request.amount_provided != null ? String(request.amount_provided) : "");
    setEditStory(request.answer_text ?? "");
  }, [request]);

  if (loading || detailLoading) {
    return (
      <PrayerShell title="Request" back="/prayer/requests" hideTabs>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PrayerShell>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!request) return <Navigate to="/prayer/requests" replace />;

  const mergedScriptures = mergeScriptureDisplay(request.scripture_refs, events);
  const hasAnswerData =
    request.answered_at != null ||
    request.amount_provided != null ||
    (request.answer_text != null && request.answer_text.trim().length > 0);
  const canRecordFullAnswer =
    request.status === "waiting" && !request.praise_report_entry_id;
  const canRecordPartial =
    (request.status === "waiting" || request.status === "partial") &&
    !request.praise_report_entry_id;

  const onStatusChange = async (status: PrayerRequestStatus) => {
    if (CELEBRATION_STATUSES.includes(status) && !request.praise_report_entry_id) {
      navigate(`/prayer/requests/${request.id}/celebrate?status=${status}`);
      return;
    }
    setBusy(true);
    try {
      await updatePrayerRequest(user.id, request.id, { status });
      await reload();
      toast({ title: "Status updated" });
      if (status === "partial") {
        await addEvent({ eventKind: "note", title: "Partial answer noted" });
      }
    } catch (e) {
      toast({ title: "Update failed", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openPartialForm = () => {
    setPartialAnsweredAt(request.answered_at ?? localDateISO());
    setPartialAmount(request.amount_provided != null ? String(request.amount_provided) : "");
    setPartialStory(request.answer_text ?? "");
    setShowPartialForm(true);
  };

  const savePartialProvision = async () => {
    const hasAny =
      partialAnsweredAt.trim() ||
      partialAmount.trim() ||
      partialStory.trim();
    if (!hasAny) {
      toast({ title: "Add at least one detail", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await updatePrayerRequest(user.id, request.id, {
        status: "partial",
        answered_at: partialAnsweredAt.trim() || null,
        amount_provided: parseLedgerAmount(partialAmount),
        answer_text: partialStory.trim() || null,
      });
      await reload();
      setShowPartialForm(false);
      toast({ title: "Partial provision recorded" });
    } catch (e) {
      toast({ title: "Could not save", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const saveAnswerFields = async () => {
    setBusy(true);
    try {
      await updatePrayerRequest(user.id, request.id, {
        answered_at: editAnsweredAt.trim() || null,
        amount_provided: parseLedgerAmount(editAmount),
        answer_text: editStory.trim() || null,
      });
      await reload();
      toast({ title: "Ledger answer fields updated" });
    } catch (e) {
      toast({ title: "Could not save", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!noteTitle.trim()) return;
    setBusy(true);
    try {
      await addEvent({ eventKind: "note", title: noteTitle.trim(), body: noteBody.trim() || null });
      setNoteTitle("");
      setNoteBody("");
      toast({ title: "Added to timeline" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this prayer request and its timeline?")) return;
    await deletePrayerRequest(user.id, request.id);
    navigate("/prayer/requests");
  };

  if (editing) {
    return (
      <PrayerShell title="Edit request" back={`/prayer/requests/${request.id}`} hideTabs>
        <PrayerRequestForm
          initial={{
            title: request.title,
            requestedAt: request.requested_at,
            deadline: request.deadline ?? "",
            category: request.category,
            amountRequested:
              request.amount_requested != null ? String(request.amount_requested) : "",
            purpose: request.purpose,
            prayerText: request.prayer_text,
            privateNotes: request.private_notes,
            scriptureRefs: request.scripture_refs,
            answeredAt: request.answered_at ?? "",
            amountProvided:
              request.amount_provided != null ? String(request.amount_provided) : "",
            answerText: request.answer_text ?? "",
          }}
          showAnswerFields={hasAnswerData || request.status === "partial"}
          submitLabel="Save changes"
          busy={busy}
          onSubmit={async (values) => {
            setBusy(true);
            try {
              await updatePrayerRequest(user.id, request.id, {
                title: values.title,
                requested_at: values.requestedAt,
                deadline: values.deadline || null,
                category: values.category,
                amount_requested: values.amountRequestedNum,
                purpose: values.purpose,
                prayer_text: values.prayerText,
                private_notes: values.privateNotes,
                scripture_refs: values.scriptureRefs,
                ...(hasAnswerData || request.status === "partial"
                  ? {
                      answered_at: values.answeredAt?.trim() || null,
                      amount_provided:
                        values.amountProvidedNum ?? parseLedgerAmount(values.amountProvided ?? ""),
                      answer_text: values.answerText?.trim() || null,
                    }
                  : {}),
              });
              await reload();
              toast({ title: "Saved" });
              setEditing(false);
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button variant="ghost" className="mt-4" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </PrayerShell>
    );
  }

  return (
    <PrayerShell title={request.title} back="/prayer/requests" hideTabs>
      <div className="space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <PrayerRequestStatusBadge status={request.status} />
            <span className="text-xs text-muted-foreground">{PRAYER_CATEGORY_LABELS[request.category]}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Requested {formatDisplayDate(request.requested_at)}
            {request.answered_at ? ` · Answered ${formatDisplayDate(request.answered_at)}` : ""}
          </p>
        </header>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={request.status} onValueChange={(v) => void onStatusChange(v as PrayerRequestStatus)}>
            <SelectTrigger disabled={busy}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRAYER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PRAYER_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Story, Answered date, and Received amount are recorded when you mark a need answered — not
            in Edit. Use the buttons below or change status to Answered.
          </p>
        </div>

        {canRecordFullAnswer ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-50/50 p-4 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-start gap-3">
              <PartyPopper className="h-5 w-5 text-amber-700 dark:text-amber-300 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Ready to record provision?</p>
                <p className="text-xs text-muted-foreground">
                  Fill in the ledger Story, Answered, and Received columns and create a praise report.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate(`/prayer/requests/${request.id}/celebrate`)}>
              Record how God provided
            </Button>
          </div>
        ) : null}

        {canRecordPartial ? (
          <section className="rounded-xl border border-border/60 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-medium">Partial provision</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Record what God has provided so far without closing the need. Updates the ledger
                Answered, Received, and Story columns.
              </p>
            </div>
            {showPartialForm ? (
              <>
                <PrayerAnswerFieldsSection
                  answeredAt={partialAnsweredAt}
                  amountProvided={partialAmount}
                  answerText={partialStory}
                  onAnsweredAtChange={setPartialAnsweredAt}
                  onAmountProvidedChange={setPartialAmount}
                  onAnswerTextChange={setPartialStory}
                  disabled={busy}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy} onClick={() => void savePartialProvision()}>
                    Save partial provision
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowPartialForm(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={openPartialForm}>
                Record partial provision
              </Button>
            )}
          </section>
        ) : null}

        {hasAnswerData ? (
          <section className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-4 dark:bg-emerald-950/20 space-y-3">
            <div>
              <h3 className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Ledger answer fields
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Edit what appears in the Answered, Received, and Story columns.
              </p>
            </div>
            <PrayerAnswerFieldsSection
              answeredAt={editAnsweredAt}
              amountProvided={editAmount}
              answerText={editStory}
              onAnsweredAtChange={setEditAnsweredAt}
              onAmountProvidedChange={setEditAmount}
              onAnswerTextChange={setEditStory}
              disabled={busy}
            />
            <Button size="sm" disabled={busy} onClick={() => void saveAnswerFields()}>
              Save answer fields
            </Button>
            {request.praise_report_entry_id ? (
              <Button asChild variant="link" className="h-auto p-0 text-emerald-700 dark:text-emerald-300">
                <Link to={`/journal/${request.praise_report_entry_id}`}>View praise report</Link>
              </Button>
            ) : null}
          </section>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Amount needed</p>
            <p className="font-medium tabular-nums">{formatLedgerAmount(request.amount_requested)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Amount received</p>
            <p className="font-medium tabular-nums">{formatLedgerAmount(request.amount_provided)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Deadline</p>
            <p>{request.deadline ? formatDisplayDate(request.deadline) : "—"}</p>
          </div>
          {request.purpose ? (
            <div className="sm:col-span-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Purpose</p>
              <p>{request.purpose}</p>
            </div>
          ) : null}
        </div>

        {request.prayer_text ? (
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Prayer</h2>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{request.prayer_text}</p>
          </section>
        ) : null}

        {mergedScriptures.length > 0 ? (
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Scriptures
            </h2>
            <ul className="flex flex-wrap gap-2">
              {mergedScriptures.map((ref) => (
                <li key={ref} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {ref}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Shown in the ledger Scripture column. Add more via Edit or Link content.
            </p>
          </section>
        ) : null}

        {request.private_notes ? (
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Private notes
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {request.private_notes}
            </p>
          </section>
        ) : null}

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h2>
            <Button type="button" size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
              <Link2 className="mr-1.5 h-3.5 w-3.5" />
              Link content
            </Button>
          </div>
          <PrayerTimelineView events={events} />
        </section>

        <section className="rounded-xl border border-border/60 p-4 space-y-3">
          <h3 className="text-sm font-medium">Add timeline note</h3>
          <Input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Opportunity appeared"
          />
          <PolishedTextarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Optional detail…"
            className="min-h-[72px] resize-none"
          />
          <Button size="sm" disabled={busy || !noteTitle.trim()} onClick={() => void addNote()}>
            Add to timeline
          </Button>
        </section>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={() => void remove()}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <PrayerLinkPicker
        userId={user.id}
        open={linkOpen}
        onOpenChange={setLinkOpen}
        onLinkJournal={linkJournalEntry}
        onLinkArtifact={linkArtifact}
        onLinkVerse={linkVerse}
      />
    </PrayerShell>
  );
}
