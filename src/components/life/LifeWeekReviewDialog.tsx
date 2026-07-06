import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Film, Loader2, Mic, X } from "lucide-react";
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
import { useLifeWeekReview, type LifeWeekReviewVideoCapture } from "@/contexts/LifeWeekReviewContext";
import { parseFamilyFromLayout, familyMemberById } from "@/lib/lifeWeeksFamily";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import { useJournalVideoLaunch } from "@/contexts/JournalVideoLaunchContext";
import { journalVideoCaptureSupported } from "@/lib/journal/videos";
import type { JournalVideoCaptureResult } from "@/hooks/useJournalVideoCapture";
import { pickBestVideoJournalTranscript } from "@/lib/journal/journalVideoBody";

type Props = {
  open: boolean;
  pending: PendingLifeWeekReview;
  saving: boolean;
  remainingCount: number;
  dismissalsLeft: number;
  onComplete: (reflection: string, video?: LifeWeekReviewVideoCapture) => Promise<void>;
  onDismiss: () => void;
};

function gridLabel(pending: PendingLifeWeekReview): string {
  if (pending.chartKind === "blink") {
    return `${pending.personName}'s Blink of an Eye grid`;
  }
  return "your life grid";
}

function attachVideoToDraft(
  result: JournalVideoCaptureResult,
  durationMs: number,
): LifeWeekReviewVideoCapture {
  return { result, durationMs };
}

export function LifeWeekReviewDialog({
  open,
  pending,
  saving,
  remainingCount,
  dismissalsLeft,
  onComplete,
  onDismiss,
}: Props) {
  const { user, profile } = useAuth();
  const { getDraft, patchDraft } = useLifeWeekReview();
  const { launch: launchVideo } = useJournalVideoLaunch();
  const draft = getDraft(pending.subject, pending.weekIndex);
  const { checked, reflection, recordedVideo } = draft;
  const [dictInterim, setDictInterim] = useState("");
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const reflectionSectionRef = useRef<HTMLDivElement | null>(null);

  const displayReflection = mergeDictatedText(reflection, dictInterim);
  const trimmedLen = displayReflection.trim().length;
  const hasVideo = recordedVideo != null;
  const canSubmit =
    checked && !saving && (hasVideo || trimmedLen >= LIFE_WEEK_REFLECTION_MIN);
  const currentWeekIndex = pending.weekIndex + 1;
  const reflectionPrompt = lifeWeekReflectionPrompt(pending.subject, pending.personName);

  const selfBirthDate = profile?.date_of_birth?.trim() ?? null;
  const familyMembers = parseFamilyFromLayout(profile?.layout);
  const blinkBirthDate =
    pending.subject === "self"
      ? selfBirthDate
      : familyMemberById(familyMembers, pending.subject).birthDate;

  useEffect(() => {
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

  const setChecked = (value: boolean) => {
    patchDraft(pending.subject, pending.weekIndex, { checked: value });
  };

  const setReflection = (value: string | ((prev: string) => string)) => {
    patchDraft(pending.subject, pending.weekIndex, (prev) => ({
      reflection: typeof value === "function" ? value(prev.reflection) : value,
    }));
  };

  const saveVideoCapture = (result: JournalVideoCaptureResult, durationMs: number) => {
    const video = attachVideoToDraft(result, durationMs);
    const spoken = pickBestVideoJournalTranscript(
      result.liveTranscript,
      result.peakLiveTranscript,
    ).trim();
    patchDraft(pending.subject, pending.weekIndex, (prev) => ({
      checked: true,
      recordedVideo: video,
      reflection: spoken ? mergeDictatedText(prev.reflection, spoken) : prev.reflection,
    }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    dictateRef.current?.stop();
    const finalReflection = mergeDictatedText(reflection, dictInterim).trim();
    try {
      await onComplete(finalReflection, recordedVideo ?? undefined);
      const who = pending.subject === "self" ? "Your" : `${pending.personName}'s`;
      toast({
        title: `${who} week ${pending.weekNumber.toLocaleString()} closed`,
        description: hasVideo ? "Video saved to Week reviews." : undefined,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not save review",
        description: e instanceof Error ? e.message : "Try again.",
      });
    }
  };

  const handleLaunchVideo = () => {
    dictateRef.current?.stop();
    patchDraft(pending.subject, pending.weekIndex, { checked: true });
    launchVideo({
      teleprompter: reflectionPrompt,
      defaultMode: "camera",
      reviewBeforeUpload: true,
      forceInline: true,
      confirmLabel: "Use for week close-out",
      reviewHint:
        "Stopping only pauses here — tap the button below to attach this recording to your week review.",
      onLiveTranscript: (text) => {
        setDictInterim("");
        setReflection(text);
      },
      onReviewReady: saveVideoCapture,
      onComplete: saveVideoCapture,
    });
  };

  return (
    <Dialog open={open}>
      <DialogContent
        hideCloseButton
        className="max-h-[min(92dvh,720px)] max-w-lg overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 h-8 w-8"
          onClick={onDismiss}
          aria-label={
            dismissalsLeft <= 1
              ? "Dismiss week review"
              : `Remind me later (${dismissalsLeft} left)`
          }
          title={
            dismissalsLeft <= 1
              ? "Dismiss — this week won't prompt again until you close it from Life Weeks"
              : `Remind me later (${dismissalsLeft} reminders left before this stops appearing)`
          }
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
            {dismissalsLeft > 0 ? (
              <span className="mt-1 block text-xs text-muted-foreground">
                Not ready? Close with{" "}
                <span className="font-medium text-foreground">×</span> — it comes back on refresh (
                {dismissalsLeft} reminder{dismissalsLeft === 1 ? "" : "s"} left).
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

              {journalVideoCaptureSupported() ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Talk it out on video</p>
                      <p className="text-xs text-muted-foreground">
                        After you stop, tap <span className="font-medium text-foreground">Use for week close-out</span>{" "}
                        on the review screen — then come back here and tap Close this week.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={hasVideo ? "secondary" : "default"}
                      className="shrink-0 gap-2"
                      onClick={handleLaunchVideo}
                    >
                      <Film className="h-4 w-4" />
                      {hasVideo ? "Re-record video" : "Record video"}
                    </Button>
                  </div>
                  {hasVideo ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Video attached — tap Close this week to save it to Week reviews.
                    </p>
                  ) : null}
                </div>
              ) : null}

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
                {hasVideo
                  ? "Video attached — transcript optional."
                  : `${trimmedLen}/${LIFE_WEEK_REFLECTION_MIN} characters minimum`}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {!checked ? (
            <Button
              type="button"
              onClick={() => setChecked(true)}
              className="w-full sm:w-auto"
            >
              Check off week {pending.weekNumber.toLocaleString()}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="w-full sm:w-auto"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Close this week"}
            </Button>
          )}
          {dismissalsLeft > 0 ? (
            <Button type="button" variant="outline" onClick={onDismiss} className="w-full sm:w-auto">
              Remind me later
              <span className="ml-1.5 text-muted-foreground tabular-nums">
                ({dismissalsLeft} left)
              </span>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
