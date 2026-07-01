import { useEffect, useRef, useState } from "react";
import { Film, Loader2, Mic, X } from "lucide-react";
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
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import { useJournalVideoLaunch } from "@/contexts/JournalVideoLaunchContext";
import { journalVideoCaptureSupported } from "@/lib/journal/videos";

type Props = {
  open: boolean;
  pending: PendingLifeWeekReview;
  saving: boolean;
  remainingCount: number;
  onComplete: (reflection: string) => Promise<void>;
  onDismiss: () => void;
};

function gridLabel(pending: PendingLifeWeekReview): string {
  if (pending.chartKind === "blink") {
    return `${pending.personName}'s Blink of an Eye grid`;
  }
  return "your life grid";
}

export function LifeWeekReviewDialog({
  open,
  pending,
  saving,
  remainingCount,
  onComplete,
  onDismiss,
}: Props) {
  const { user, profile } = useAuth();
  const { launch: launchVideo } = useJournalVideoLaunch();
  const [checked, setChecked] = useState(false);
  const [reflection, setReflection] = useState("");
  const [dictInterim, setDictInterim] = useState("");
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const reflectionSectionRef = useRef<HTMLDivElement | null>(null);

  const displayReflection = mergeDictatedText(reflection, dictInterim);
  const trimmedLen = displayReflection.trim().length;
  const canSubmit = checked && trimmedLen >= LIFE_WEEK_REFLECTION_MIN && !saving;
  const currentWeekIndex = pending.weekIndex + 1;
  const reflectionPrompt = lifeWeekReflectionPrompt(pending.subject, pending.personName);

  const selfBirthDate = profile?.date_of_birth?.trim() ?? null;
  const familyMembers = parseFamilyFromLayout(profile?.layout);
  const blinkBirthDate =
    pending.subject === "self"
      ? selfBirthDate
      : familyMemberById(familyMembers, pending.subject).birthDate;

  useEffect(() => {
    setChecked(false);
    setReflection("");
    setDictInterim("");
    dictateRef.current?.stop();
  }, [pending.subject, pending.weekIndex]);

  useEffect(() => {
    if (!checked) return;
    const id = window.requestAnimationFrame(() => {
      reflectionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [checked]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    dictateRef.current?.stop();
    const finalReflection = mergeDictatedText(reflection, dictInterim).trim();
    try {
      await onComplete(finalReflection);
      setChecked(false);
      setReflection("");
      setDictInterim("");
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
        className="max-h-[min(92dvh,720px)] max-w-lg overflow-y-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 h-8 w-8"
          onClick={onDismiss}
          aria-label="Close week review"
        >
          <X className="h-4 w-4" />
        </Button>

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
            <div
              ref={reflectionSectionRef}
              className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <Label htmlFor="life-week-reflection" className="text-sm leading-snug">
                {reflectionPrompt}
              </Label>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
                  <DictateButton
                    ref={dictateRef}
                    userId={user?.id}
                    size="md"
                    className="h-11 w-11 shrink-0 rounded-full border border-border bg-background shadow-sm"
                    onAppend={(chunk) => setReflection((r) => mergeDictatedText(r, chunk))}
                    onInterim={setDictInterim}
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Mic className="h-4 w-4 text-primary" aria-hidden />
                      Tap mic · speak your reflection
                    </p>
                    <p className="text-xs text-muted-foreground">Tap again when you&apos;re done talking.</p>
                  </div>
                </div>

                {journalVideoCaptureSupported() ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto shrink-0 flex-col gap-1.5 px-4 py-3"
                    onClick={() => {
                      dictateRef.current?.stop();
                      launchVideo({
                        teleprompter: reflectionPrompt,
                        defaultMode: "camera",
                        onLiveTranscript: (text) => {
                          setDictInterim("");
                          setReflection(text);
                        },
                        onComplete: (result) => {
                          const spoken = result.liveTranscript.trim();
                          if (spoken) {
                            setReflection((r) => mergeDictatedText(r, spoken));
                          }
                        },
                      });
                    }}
                  >
                    <Film className="h-5 w-5" />
                    <span className="text-xs font-medium">Record video</span>
                  </Button>
                ) : null}
              </div>

              <Textarea
                id="life-week-reflection"
                value={displayReflection}
                onChange={(e) => {
                  setDictInterim("");
                  setReflection(e.target.value);
                }}
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
