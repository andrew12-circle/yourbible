import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { POSTER_CLASS } from "@/lib/lifeWeeksGrid";
import type { FamilyMemberId } from "@/lib/lifeWeeksFamily";

type FamilyBirthDatePromptProps = {
  memberId: FamilyMemberId;
  memberName: string;
  saving: boolean;
  dobMax: string;
  onSave: (birthDate: string) => void;
};

export function FamilyBirthDatePrompt({
  memberId,
  memberName,
  saving,
  dobMax,
  onSave,
}: FamilyBirthDatePromptProps) {
  const [draft, setDraft] = useState("");

  return (
    <section className={`mx-auto max-w-md p-4 sm:p-5 ${POSTER_CLASS}`}>
      <p className="text-sm leading-relaxed" style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>
        Add {memberName}&apos;s birthdate to see <em>The Blink of an Eye</em> — life-years 0 through 17 at home, one week at a time.
      </p>
      <div className="mt-4 max-w-xs space-y-2">
        <Label htmlFor={`family-dob-${memberId}`} className="text-xs uppercase tracking-wide text-muted-foreground">
          {memberName}&apos;s birth date
        </Label>
        <Input
          id={`family-dob-${memberId}`}
          type="date"
          value={draft}
          max={dobMax}
          onChange={(e) => setDraft(e.target.value)}
          className="bg-white/80 dark:bg-zinc-900/80"
        />
      </div>
      <Button type="button" className="mt-4" disabled={saving || !draft.trim()} onClick={() => onSave(draft)}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Save ${memberName}'s birthdate`}
      </Button>
    </section>
  );
}
