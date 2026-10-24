import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import PrayerScroll from "@/components/prayer/PrayerScroll";
import PrayerCategorySelect from "@/components/prayer/PrayerCategorySelect";
import PrayerScriptureRefsInput from "@/components/prayer/PrayerScriptureRefsInput";
import PrayerAnswerFieldsSection from "@/components/prayer/PrayerAnswerFieldsSection";
import { localDateISO } from "@/lib/habits/dates";
import { parseLedgerAmount } from "@/lib/prayer/money";
import {
  PRAYER_NEED_KINDS,
  PRAYER_NEED_KIND_LABELS,
  PRAYER_PRIORITIES,
  PRAYER_PRIORITY_LABELS,
} from "@/lib/prayer/provisionLedger";
import type {
  PrayerCategory,
  PrayerNeedKind,
  PrayerPriority,
  ScriptureRef,
} from "@/lib/prayer/types";

export type PrayerRequestFormValues = {
  title: string;
  requestedAt: string;
  deadline: string;
  category: PrayerCategory;
  priority: PrayerPriority;
  needKind: PrayerNeedKind;
  amountRequested: string;
  purpose: string;
  consequence: string;
  provisionSource: string;
  prayerText: string;
  privateNotes: string;
  scriptureRefs: ScriptureRef[];
  answeredAt?: string;
  amountProvided?: string;
  answerText?: string;
};

type Props = {
  initial?: Partial<PrayerRequestFormValues>;
  submitLabel?: string;
  busy?: boolean;
  showAnswerFields?: boolean;
  onSubmit: (
    values: PrayerRequestFormValues & {
      amountRequestedNum: number | null;
      amountProvidedNum?: number | null;
    },
  ) => void | Promise<void>;
};

export default function PrayerRequestForm({
  initial,
  submitLabel = "Save request",
  busy = false,
  showAnswerFields = false,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [requestedAt, setRequestedAt] = useState(initial?.requestedAt ?? localDateISO());
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [category, setCategory] = useState<PrayerCategory>(initial?.category ?? "finances");
  const [priority, setPriority] = useState<PrayerPriority>(initial?.priority ?? "important");
  const [needKind, setNeedKind] = useState<PrayerNeedKind>(initial?.needKind ?? "need");
  const [amountRequested, setAmountRequested] = useState(initial?.amountRequested ?? "");
  const [purpose, setPurpose] = useState(initial?.purpose ?? "");
  const [consequence, setConsequence] = useState(initial?.consequence ?? "");
  const [provisionSource, setProvisionSource] = useState(initial?.provisionSource ?? "");
  const [prayerText, setPrayerText] = useState(initial?.prayerText ?? "");
  const [privateNotes, setPrivateNotes] = useState(initial?.privateNotes ?? "");
  const [scriptureRefs, setScriptureRefs] = useState<ScriptureRef[]>(initial?.scriptureRefs ?? []);
  const [answeredAt, setAnsweredAt] = useState(initial?.answeredAt ?? "");
  const [amountProvided, setAmountProvided] = useState(initial?.amountProvided ?? "");
  const [answerText, setAnswerText] = useState(initial?.answerText ?? "");

  const missingSpecifics = useMemo(() => {
    const missing: string[] = [];
    if (parseLedgerAmount(amountRequested) == null) missing.push("exact amount");
    if (!deadline) missing.push("deadline");
    if (!purpose.trim()) missing.push("purpose");
    if (!consequence.trim()) missing.push("what happens if it is not covered");
    return missing;
  }, [amountRequested, deadline, purpose, consequence]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      requestedAt,
      deadline,
      category,
      priority,
      needKind,
      amountRequested,
      amountRequestedNum: parseLedgerAmount(amountRequested),
      purpose: purpose.trim(),
      consequence: consequence.trim(),
      provisionSource: provisionSource.trim(),
      prayerText: prayerText.trim(),
      privateNotes: privateNotes.trim(),
      scriptureRefs,
      ...(showAnswerFields
        ? {
            answeredAt,
            amountProvided,
            answerText: answerText.trim(),
            amountProvidedNum: parseLedgerAmount(amountProvided),
          }
        : {}),
    });
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <p className="text-sm font-medium">Request → Provision → Praise</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Be specific enough that you can later see exactly what was requested, when it was needed,
          what actually happened, and what remains.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prayer-title">What exactly do you need?</Label>
        <Input
          id="prayer-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Second mortgage reinstatement"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prayer-amount">Exact amount needed</Label>
          <Input
            id="prayer-amount"
            value={amountRequested}
            onChange={(e) => setAmountRequested(e.target.value)}
            placeholder="$8,127.42"
            inputMode="decimal"
          />
          <p className="text-xs text-muted-foreground">
            If it is not known yet, leave it blank and the ledger will flag it for follow-up.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="prayer-deadline">Need-by date</Label>
          <Input
            id="prayer-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as PrayerPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRAYER_PRIORITIES.map((value) => (
                <SelectItem key={value} value={value}>{PRAYER_PRIORITY_LABELS[value]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={needKind} onValueChange={(v) => setNeedKind(v as PrayerNeedKind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRAYER_NEED_KINDS.map((value) => (
                <SelectItem key={value} value={value}>{PRAYER_NEED_KIND_LABELS[value]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prayer-date">Date requested</Label>
          <Input
            id="prayer-date"
            type="date"
            value={requestedAt}
            onChange={(e) => setRequestedAt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <PrayerCategorySelect value={category} onChange={setCategory} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prayer-purpose">Why is this needed?</Label>
        <PolishedTextarea
          id="prayer-purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Bring the second mortgage current before the lender's deadline."
          className="min-h-[76px] resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prayer-consequence">What happens if it is not covered by the deadline?</Label>
        <PolishedTextarea
          id="prayer-consequence"
          value={consequence}
          onChange={(e) => setConsequence(e.target.value)}
          placeholder="The account remains in default and foreclosure action can continue."
          className="min-h-[76px] resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="provision-source">Expected / known provision source (optional)</Label>
        <Input
          id="provision-source"
          value={provisionSource}
          onChange={(e) => setProvisionSource(e.target.value)}
          placeholder="Expected commission from the Smith closing — not received yet"
        />
        <p className="text-xs text-muted-foreground">
          A possible source does not count as received until the provision actually arrives.
        </p>
      </div>

      <div
        className={
          missingSpecifics.length
            ? "rounded-xl border border-amber-300/60 bg-amber-50/40 p-3 dark:bg-amber-950/10"
            : "rounded-xl border border-emerald-300/60 bg-emerald-50/40 p-3 dark:bg-emerald-950/10"
        }
      >
        <div className="flex items-start gap-2">
          {missingSpecifics.length ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          )}
          <div>
            <p className="text-sm font-medium">
              Specificity: {4 - missingSpecifics.length}/4
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {missingSpecifics.length
                ? `Still determine: ${missingSpecifics.join(", ")}. You can save now and fill these in when known.`
                : "Amount, deadline, purpose, and consequence are all recorded."}
            </p>
          </div>
        </div>
      </div>

      <PrayerScroll label="Prayer" variant="compose" as="div">
        <PolishedTextarea
          id="prayer-text"
          value={prayerText}
          onChange={(e) => setPrayerText(e.target.value)}
          placeholder="Father, I am specifically asking for this provision..."
          className="min-h-[120px] resize-none border-0 bg-transparent px-0 py-1 font-scripture text-[16px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </PrayerScroll>

      <div className="space-y-2">
        <Label>Scriptures standing on</Label>
        <PrayerScriptureRefsInput value={scriptureRefs} onChange={setScriptureRefs} />
        <p className="text-xs text-muted-foreground">
          Browse provision and faith verses with full text, or type a reference. Shows in the ledger
          Scripture column.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prayer-notes">Accounting / follow-up notes</Label>
        <PolishedTextarea
          id="prayer-notes"
          value={privateNotes}
          onChange={(e) => setPrivateNotes(e.target.value)}
          placeholder="Statement amount still needs confirmation; call lender tomorrow."
          className="min-h-[80px] resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Use this for amounts still to verify, bill changes, calls, confirmation numbers, or other follow-up.
        </p>
      </div>

      {showAnswerFields ? (
        <div className="rounded-xl border border-border/60 p-4 space-y-1">
          <h3 className="text-sm font-medium">Provision recorded</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Edit the ledger Answered, Received, and Story columns.
          </p>
          <PrayerAnswerFieldsSection
            answeredAt={answeredAt}
            amountProvided={amountProvided}
            answerText={answerText}
            onAnsweredAtChange={setAnsweredAt}
            onAmountProvidedChange={setAmountProvided}
            onAnswerTextChange={setAnswerText}
            disabled={busy}
          />
        </div>
      ) : null}

      <Button type="submit" disabled={busy || !title.trim()} className="w-full sm:w-auto">
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
