import { useState } from "react";
import { BookOpen, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PrayerScripturePickerDialog from "@/components/prayer/PrayerScripturePickerDialog";
import { PrayerScriptureReviewList } from "@/components/prayer/PrayerScriptureReviewCard";
import type { ScriptureRef } from "@/lib/prayer/types";

export default function PrayerScriptureRefsInput({
  value,
  onChange,
}: {
  value: ScriptureRef[];
  onChange: (refs: ScriptureRef[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const refStrings = value.map((v) => v.ref);

  const add = (ref?: string) => {
    const next = (ref ?? draft).trim();
    if (!next) return;
    if (value.some((v) => v.ref.toLowerCase() === next.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, { ref: next }]);
    setDraft("");
  };

  const remove = (ref: string) => {
    onChange(value.filter((v) => v.ref !== ref));
  };

  const toggleFromPicker = (ref: string) => {
    const exists = value.some((v) => v.ref.toLowerCase() === ref.toLowerCase());
    if (exists) {
      remove(value.find((v) => v.ref.toLowerCase() === ref.toLowerCase())!.ref);
    } else {
      onChange([...value, { ref }]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
          className="gap-1.5"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Browse scriptures
        </Button>
        <p className="text-xs text-muted-foreground self-center">
          Finances, provision, faith — with full verse text
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Or type a reference — Philippians 4:19"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" onClick={() => add()} aria-label="Add scripture">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {value.length > 0 ? (
        <PrayerScriptureReviewList refs={refStrings} onRemove={remove} />
      ) : (
        <p className="text-xs text-muted-foreground">
          Add verses you are standing on — expand each to read the full text daily.
        </p>
      )}

      <PrayerScripturePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedRefs={refStrings}
        onSelect={toggleFromPicker}
      />
    </div>
  );
}
