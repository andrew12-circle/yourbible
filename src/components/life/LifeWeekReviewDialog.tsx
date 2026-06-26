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
  LIFE_WEEK_REFLECTION_PROMPT,
  type PendingLifeWeekReview,
} from "@/lib/lifeWeekReview";
import { toast } from "@/hooks/use-toast";
import { LifeWeekReviewGridSnippet } from "@/components/life/LifeWeekReviewGridSnippet";

type Props = {
  open: boolean;
  pending: PendingLifeWeekReview;
  saving: boolean;
  onComplete: (reflection: string) => Promise<void>;
};

export function LifeWeekReviewDialog({ open, pending, saving, onComplete }: Props) {
  const [checked, setChecked] = useState(false);
  const [reflection, setReflection] = useState("");

  const trimmedLen = reflection.trim().length;
  const canSubmit = checked && trimmedLen >= LIFE_WEEK_REFLECTION_MIN && !saving;
  const currentWeekIndex = pending.weekIndex + 1;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await onComplete(reflection);
      setChecked(false);
      setReflection("");
      toast({ title: `Week ${pending.weekNumber.toLocaleString()} closed` });
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
          <DialogTitle>Close out last week</DialogTitle>
          <DialogDescription>
            A new week started Monday. Before you move on, check off week{" "}
            {pending.weekNumber.toLocaleString()} ({pending.weekRangeLabel}) on your life grid, then
            reflect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <LifeWeekReviewGridSnippet
            weekIndex={pending.weekIndex}
            currentWeekIndex={currentWeekIndex}
            checked={checked}
            onToggle={() => setChecked(true)}
          />

          {checked ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label htmlFor="life-week-reflection" className="text-sm leading-snug">
                {LIFE_WEEK_REFLECTION_PROMPT}
              </Label>
              <Textarea
                id="life-week-reflection"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Be honest. What moved you toward your calling—and what did you let slip?"
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
