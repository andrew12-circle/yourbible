import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LIFE_WEEK_REFLECTION_MIN,
  lifeWeekReflectionPrompt,
  type PendingLifeWeekReview,
} from "@/lib/lifeWeekReview";
import { toast } from "@/hooks/use-toast";
import { LifeWeekReviewGridSnippet } from "@/components/life/LifeWeekReviewGridSnippet";
import { BlinkLifeWeekReviewGridSnippet } from "@/components/life/BlinkLifeWeekReviewGridSnippet";
import { useAuth } from "@/contexts/AuthContext";
import { parseFamilyFromLayout, familyMemberById } from "@/lib/lifeWeeksFamily";

type Props = {
  open: boolean;
  pending: PendingLifeWeekReview;
  saving: boolean;
  remainingCount: number;
  onComplete: (reflection: string) => Promise<void>;
};

function gridLabel(pending: PendingLifeWeekReview): string {
  if (pending.chartKind === "blink") {
    return `${pending.personName}'s Blink of an Eye grid`;
  }
  return "your life grid";
}

export function LifeWeekReviewDialog({ open, pending, saving, remainingCount, onComplete }: Props) {
  const { profile } = useAuth();
  const [checked, setChecked] = useState(false);
  const [reflection, setReflection] = useState("");

  const trimmedLen = reflection.trim().length;
  const canSubmit = checked && trimmedLen >= LIFE_WEEK_REFLECTION_MIN && !saving;
  const currentWeekIndex = pending.weekIndex + 1;
  const reflectionPrompt = lifeWeekReflectionPrompt(pending.subject, pending.personName);

  const selfBirthDate = profile?.date_of_birth?.trim() ?? null;
  const familyMembers = parseFamilyFromLayout(profile?.layout);
  const blinkBirthDate =
    pending.subject === "self"
      ? selfBirthDate
      : familyMemberById(familyMembers, pending.subject).birthDate;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await onComplete(reflection);
      setChecked(false);
      setReflection("");
      const who = pending.subject === "self" ? "Your" : `${pending.personName}'s`;
      toast({ title: `${who} week ${pending.weekNumber.toLocaleString()} closed` });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not save review",
        description: e instanceof Error ? e.message : "Try again.",
      });
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {pending.subject === "self"
              ? "Close out last week"
              : `Close out ${pending.personName}'s last week`}
          </DialogTitle>
          <DialogDescription>
            A new week started Monday. Before you move on, check off week{" "}
            {pending.weekNumber.toLocaleString()} ({pending.weekRangeLabel}) on {gridLabel(pending)}, then
            reflect.
            {remainingCount > 1 ? (
              <span className="mt-1 block text-xs">
                {remainingCount - 1} more week{remainingCount - 1 === 1 ? "" : "s"} to close after this.
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {pending.chartKind === "blink" && blinkBirthDate ? (
            <BlinkLifeWeekReviewGridSnippet
              birthDate={blinkBirthDate}
              weekIndex={pending.weekIndex}
              currentWeekIndex={currentWeekIndex}
              checked={checked}
              onToggle={() => setChecked(true)}
              personName={pending.personName}
            />
          ) : (
            <LifeWeekReviewGridSnippet
              weekIndex={pending.weekIndex}
              currentWeekIndex={currentWeekIndex}
              checked={checked}
              onToggle={() => setChecked(true)}
            />
          )}

          {checked ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label htmlFor="life-week-reflection" className="text-sm leading-snug">
                {reflectionPrompt}
              </Label>
              <Textarea
                id="life-week-reflection"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder={
                  pending.subject === "self"
                    ? "Be honest. What moved you toward your calling—and what did you let slip?"
                    : `What do you want to remember about ${pending.personName}'s week?`
                }
                rows={5}
                className="resize-none"
                autoFocus
              />
              <p className="text-xs text-muted-foreground tabular-nums">
                {trimmedLen}/{LIFE_WEEK_REFLECTION_MIN} characters minimum
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Close this week"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
