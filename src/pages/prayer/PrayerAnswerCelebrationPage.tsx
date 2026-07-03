import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, PartyPopper } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PrayerShell from "@/components/prayer/PrayerShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { toast } from "@/hooks/use-toast";
import { fetchPrayerRequest } from "@/lib/prayer/api";
import { completePrayerAnswer } from "@/lib/prayer/completePrayerAnswer";
import {
  buildPraiseReportBody,
  buildPraiseReportTitle,
} from "@/lib/prayer/praiseReportFromRequest";
import { computeWaitDays, formatDisplayDate, humanizeWaitDays } from "@/lib/prayer/stats";
import { localDateISO } from "@/lib/habits/dates";
import type { PrayerRequestRow, PrayerRequestStatus } from "@/lib/prayer/types";

export default function PrayerAnswerCelebrationPage() {
  const { user, loading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const statusParam = params.get("status") as PrayerRequestStatus | null;

  const [request, setRequest] = useState<PrayerRequestRow | null>(null);
  const [fetching, setFetching] = useState(true);
  const [answeredAt, setAnsweredAt] = useState(localDateISO());
  const [answerText, setAnswerText] = useState("");
  const [praiseBody, setPraiseBody] = useState("");
  const [busy, setBusy] = useState(false);

  const celebrationStatus: "answered" | "different_answer" =
    statusParam === "different_answer" ? "different_answer" : "answered";

  useEffect(() => {
    if (!user?.id || !id) return;
    void (async () => {
      setFetching(true);
      const row = await fetchPrayerRequest(user.id, id);
      setRequest(row);
      if (row) {
        setPraiseBody(
          buildPraiseReportBody({
            ...row,
            answered_at: localDateISO(),
            answer_text: "",
            status: celebrationStatus,
          }),
        );
      }
      setFetching(false);
    })();
  }, [user?.id, id, celebrationStatus]);

  if (loading || fetching) {
    return (
      <PrayerShell title="Celebration" hideTabs>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PrayerShell>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!request) return <Navigate to="/prayer/requests" replace />;
  if (request.praise_report_entry_id) {
    return <Navigate to={`/prayer/requests/${request.id}`} replace />;
  }

  const previewWait = humanizeWaitDays(
    computeWaitDays({ requested_at: request.requested_at, answered_at: answeredAt }) ?? 0,
  );

  const submit = async () => {
    if (!answerText.trim()) {
      toast({ title: "Describe how God answered", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const result = await completePrayerAnswer(user.id, request, {
        answerText,
        answeredAt,
        status: celebrationStatus,
        praiseBodyOverride: praiseBody,
      });
      if (result) {
        toast({ title: "Praise report created" });
        navigate(`/journal/${result.praiseEntryId}`);
      }
    } catch (e) {
      toast({ title: "Could not save", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PrayerShell title="Prayer answered" back={`/prayer/requests/${request.id}`} hideTabs>
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          <PartyPopper className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">
          {celebrationStatus === "different_answer" ? "God answered differently" : "God answered"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Record this memorial of faithfulness. It will become a permanent praise report.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">Requested:</span> {formatDisplayDate(request.requested_at)}
        </p>
        <p>
          <span className="text-muted-foreground">Answered:</span> {formatDisplayDate(answeredAt)}
        </p>
        <p>
          <span className="text-muted-foreground">Waited:</span> {previewWait}
        </p>
        {request.prayer_text ? (
          <p className="pt-2 italic">&ldquo;{request.prayer_text}&rdquo;</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="answered-date">Date answered</Label>
          <Input
            id="answered-date"
            type="date"
            value={answeredAt}
            onChange={(e) => {
              setAnsweredAt(e.target.value);
              setPraiseBody(
                buildPraiseReportBody(
                  {
                    ...request,
                    answered_at: e.target.value,
                    answer_text: answerText,
                    status: celebrationStatus,
                  },
                  answerText,
                ),
              );
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="answer-text">How did God answer?</Label>
          <PolishedTextarea
            id="answer-text"
            value={answerText}
            onChange={(e) => {
              setAnswerText(e.target.value);
              setPraiseBody(
                buildPraiseReportBody(
                  {
                    ...request,
                    answered_at: answeredAt,
                    answer_text: e.target.value,
                    status: celebrationStatus,
                  },
                  e.target.value,
                ),
              );
            }}
            placeholder="Closed three unexpected loans that fully covered payroll."
            className="min-h-[100px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="praise-body">Praise report preview</Label>
          <PolishedTextarea
            id="praise-body"
            value={praiseBody}
            onChange={(e) => setPraiseBody(e.target.value)}
            className="min-h-[160px] resize-none font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Title: {buildPraiseReportTitle(request)}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button disabled={busy} onClick={() => void submit()} className="flex-1">
            {busy ? "Saving…" : "Create praise report"}
          </Button>
          <Button asChild variant="outline">
            <Link to={`/prayer/requests/${request.id}`}>Back</Link>
          </Button>
        </div>
      </div>
    </PrayerShell>
  );
}
