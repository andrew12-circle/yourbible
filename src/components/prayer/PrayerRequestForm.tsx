import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import PrayerCategorySelect from "@/components/prayer/PrayerCategorySelect";
import PrayerScriptureRefsInput from "@/components/prayer/PrayerScriptureRefsInput";
import { localDateISO } from "@/lib/habits/dates";
import { parseLedgerAmount } from "@/lib/prayer/money";
import type { PrayerCategory, ScriptureRef } from "@/lib/prayer/types";

export type PrayerRequestFormValues = {
  title: string;
  requestedAt: string;
  deadline: string;
  category: PrayerCategory;
  amountRequested: string;
  purpose: string;
  prayerText: string;
  privateNotes: string;
  scriptureRefs: ScriptureRef[];
};

type Props = {
  initial?: Partial<PrayerRequestFormValues>;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (values: PrayerRequestFormValues & { amountRequestedNum: number | null }) => void | Promise<void>;
};

export default function PrayerRequestForm({
  initial,
  submitLabel = "Save request",
  busy = false,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [requestedAt, setRequestedAt] = useState(initial?.requestedAt ?? localDateISO());
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [category, setCategory] = useState<PrayerCategory>(initial?.category ?? "finances");
  const [amountRequested, setAmountRequested] = useState(initial?.amountRequested ?? "");
  const [purpose, setPurpose] = useState(initial?.purpose ?? "");
  const [prayerText, setPrayerText] = useState(initial?.prayerText ?? "");
  const [privateNotes, setPrivateNotes] = useState(initial?.privateNotes ?? "");
  const [scriptureRefs, setScriptureRefs] = useState<ScriptureRef[]>(initial?.scriptureRefs ?? []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      requestedAt,
      deadline,
      category,
      amountRequested,
      amountRequestedNum: parseLedgerAmount(amountRequested),
      purpose: purpose.trim(),
      prayerText: prayerText.trim(),
      privateNotes: privateNotes.trim(),
      scriptureRefs,
    });
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Müller&apos;s ledger: write the need, the exact amount, and the deadline — then trust God and mark it
        when provision comes.
      </p>

      <div className="space-y-2">
        <Label htmlFor="prayer-title">Item needed</Label>
        <Input
          id="prayer-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="CRM payroll"
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
            placeholder="$4,200"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prayer-deadline">Deadline</Label>
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
        <Label htmlFor="prayer-purpose">Purpose</Label>
        <Input
          id="prayer-purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Cover team payroll while cash flow catches up"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prayer-text">Prayer</Label>
        <PolishedTextarea
          id="prayer-text"
          value={prayerText}
          onChange={(e) => setPrayerText(e.target.value)}
          placeholder="Lord, provide enough business to cover payroll."
          className="min-h-[100px] resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label>Scriptures standing on</Label>
        <PrayerScriptureRefsInput value={scriptureRefs} onChange={setScriptureRefs} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prayer-notes">Notes while waiting</Label>
        <PolishedTextarea
          id="prayer-notes"
          value={privateNotes}
          onChange={(e) => setPrivateNotes(e.target.value)}
          placeholder="Impressions, progress, partial provision…"
          className="min-h-[80px] resize-none"
        />
      </div>

      <Button type="submit" disabled={busy || !title.trim()} className="w-full sm:w-auto">
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
