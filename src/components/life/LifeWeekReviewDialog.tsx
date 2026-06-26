import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
            A new week started Monday. Before you move on, look back at week{" "}
            {pending.weekNumber.toLocaleString()} ({pending.weekRangeLabel}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setChecked((v) => !v)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition",
              checked ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40",
            )}
          >
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2",
                checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 bg-muted",
              )}
              aria-hidden
            >
              {checked ? <Check className="h-6 w-6" strokeWidth={2.5} /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Check off week {pending.weekNumber.toLocaleString()}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Mark this week complete on your life grid — lived, not wasted.
              </p>
            </div>
            <Checkbox checked={checked} className="sr-only" aria-hidden tabIndex={-1} />
          </button>

          <div className="space-y-2">
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
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              {trimmedLen}/{LIFE_WEEK_REFLECTION_MIN} characters minimum
            </p>
          </div>
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
