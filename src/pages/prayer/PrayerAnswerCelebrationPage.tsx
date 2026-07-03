import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, PartyPopper } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PrayerShell from "@/components/prayer/PrayerShell";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
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
import { formatLedgerAmount, parseLedgerAmount } from "@/lib/prayer/money";
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
  const [amountProvided, setAmountProvided] = useState("");
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
        setAmountProvided(row.amount_requested != null ? String(row.amount_requested) : "");
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

  const rebuildPraise = (
    nextAnsweredAt: string,
    nextAnswer: string,
    nextAmount: string,
  ) => {
    const amountNum = parseLedgerAmount(nextAmount);
    setPraiseBody(
      buildPraiseReportBody(
        {
          ...request!,
          answered_at: nextAnsweredAt,
          answer_text: nextAnswer,
          amount_provided: amountNum,
          status: celebrationStatus,
        },
        nextAnswer,
      ),
    );
  };

  const submit = async () => {
    if (!answerText.trim()) {
      toast({ title: "Describe how God provided", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const result = await completePrayerAnswer(user.id, request, {
        answerText,
        answeredAt,
        amountProvided: parseLedgerAmount(amountProvided),
        status: celebrationStatus,
        praiseBodyOverride: praiseBody,
      });
      if (result) {
        navigate("/prayer/requests");
        toast({
          title: "Recorded in your ledger",
          description: "Praise report saved to your journal.",
          action: (
            <ToastAction
              altText="View praise report"
              onClick={() => navigate(`/journal/${result.praiseEntryId}`)}
            >
              View report
            </ToastAction>
          ),
        });
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
        {request.amount_requested != null ? (
          <p>
            <span className="text-muted-foreground">Amount needed:</span>{" "}
            {formatLedgerAmount(request.amount_requested)}
          </p>
        ) : null}
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
              rebuildPraise(e.target.value, answerText, amountProvided);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount-provided">Amount actually provided</Label>
          <Input
            id="amount-provided"
            value={amountProvided}
            onChange={(e) => {
              setAmountProvided(e.target.value);
              rebuildPraise(answeredAt, answerText, e.target.value);
            }}
            placeholder="$4,200"
            inputMode="decimal"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="answer-text">Story — how did God provide?</Label>
          <PolishedTextarea
            id="answer-text"
            value={answerText}
            onChange={(e) => {
              setAnswerText(e.target.value);
              rebuildPraise(answeredAt, e.target.value, amountProvided);
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
