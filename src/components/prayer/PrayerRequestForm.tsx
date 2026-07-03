import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import PrayerCategorySelect from "@/components/prayer/PrayerCategorySelect";
import PrayerScriptureRefsInput from "@/components/prayer/PrayerScriptureRefsInput";
import { localDateISO } from "@/lib/habits/dates";
import type { PrayerCategory, ScriptureRef } from "@/lib/prayer/types";

export type PrayerRequestFormValues = {
  title: string;
  requestedAt: string;
  category: PrayerCategory;
  prayerText: string;
  privateNotes: string;
  scriptureRefs: ScriptureRef[];
};

type Props = {
  initial?: Partial<PrayerRequestFormValues>;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (values: PrayerRequestFormValues) => void | Promise<void>;
};

export default function PrayerRequestForm({
  initial,
  submitLabel = "Save request",
  busy = false,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [requestedAt, setRequestedAt] = useState(initial?.requestedAt ?? localDateISO());
  const [category, setCategory] = useState<PrayerCategory>(initial?.category ?? "guidance");
  const [prayerText, setPrayerText] = useState(initial?.prayerText ?? "");
  const [privateNotes, setPrivateNotes] = useState(initial?.privateNotes ?? "");
  const [scriptureRefs, setScriptureRefs] = useState<ScriptureRef[]>(initial?.scriptureRefs ?? []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      requestedAt,
      category,
      prayerText: prayerText.trim(),
      privateNotes: privateNotes.trim(),
      scriptureRefs,
    });
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="prayer-title">Title</Label>
        <Input
          id="prayer-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Provision for CRM payroll"
          required
        />
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
        <Label htmlFor="prayer-notes">Private notes</Label>
        <PolishedTextarea
          id="prayer-notes"
          value={privateNotes}
          onChange={(e) => setPrivateNotes(e.target.value)}
          placeholder="Events, impressions, or progress while waiting…"
          className="min-h-[80px] resize-none"
        />
      </div>

      <Button type="submit" disabled={busy || !title.trim()} className="w-full sm:w-auto">
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
