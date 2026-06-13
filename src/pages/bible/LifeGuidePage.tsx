import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, BookMarked, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBibles, pickDefaultBibleId } from "@/hooks/useBibles";
import { useLifeGuide } from "@/hooks/useLifeGuide";
import { getStoredBibleId } from "@/lib/bible/storedBibleId";
import { LIFE_GUIDE_STARTERS } from "@/lib/bible/lifeGuide";
import { LifeGuideResult } from "@/components/bible/LifeGuideResult";
import { LifeGuideActions } from "@/components/bible/LifeGuideActions";
import { LifeGuideFollowUpPanel } from "@/components/bible/LifeGuideFollowUpPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { toast } from "@/hooks/use-toast";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import MobilePageShell from "@/components/shell/MobilePageShell";
import { hubShellScrollMain } from "@/lib/shell/hubShellClasses";
import { cn } from "@/lib/utils";

export default function LifeGuidePage() {
  const { user, loading: authLoading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const online = useOnlineStatus();
  const { data: bibles = [] } = useBibles();
  const bibleId = pickDefaultBibleId(bibles, getStoredBibleId()) ?? "";
  const [journalEntryId, setJournalEntryId] = useState<string | null>(null);
  const [playbookId, setPlaybookId] = useState<string | null>(null);

  const {
    issue,
    setIssue,
    busy,
    followUpBusy,
    saveBusy,
    error,
    result,
    followups,
    recent,
    search,
    askFollowUp,
    saveJournal,
    savePlaybook,
    loadRecent,
    clear,
  } = useLifeGuide(bibleId, user?.id);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const handleClear = () => {
    clear();
    setJournalEntryId(null);
    setPlaybookId(null);
  };

  const handleSaveJournal = async () => {
    const id = await saveJournal();
    if (id) {
      setJournalEntryId(id);
      toast({ title: "Saved to journal", description: "Your Life Manual guide is in your journal." });
    }
  };

  const handleSavePlaybook = async () => {
    const id = await savePlaybook();
    if (id) {
      setPlaybookId(id);
      toast({ title: "Added to playbook", description: "Action steps are ready to track." });
    }
  };

  const handleLoadRecent = (session: (typeof recent)[number]) => {
    loadRecent(session);
    setJournalEntryId(null);
    setPlaybookId(null);
  };

  return (
    <MobilePageShell
      showHubShell={showHubShell}
      header={
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pb-3">
          <Link
            to="/home"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <BookMarked className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
              <h1 className="truncate font-display text-xl text-leather">Life Manual</h1>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Describe your issue — find what Scripture literally says to do
            </p>
          </div>
        </div>
      }
      headerClassName="border-border/60 bg-background/90"
      mainClassName={cn(hubShellScrollMain(showHubShell), "mx-auto max-w-2xl space-y-6 px-4 py-5")}
    >
        <section className="rounded-2xl border border-border bg-card p-5">
          <label htmlFor="life-guide-issue" className="block text-sm font-medium mb-2">
            What are you facing?
          </label>
          <Textarea
            id="life-guide-issue"
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder="e.g. I'm struggling with anxiety about losing my job and don't know what to do..."
            rows={4}
            className="resize-none rounded-xl bg-muted/40 border-0 text-[15px] leading-relaxed mb-3"
            disabled={busy}
          />
          <Button
            onClick={() => void search()}
            disabled={busy || !issue.trim() || !bibleId || !online}
            className="w-full sm:w-auto"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                Searching Scripture…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" aria-hidden />
                Find biblical instruction
              </>
            )}
          </Button>
          {!online && (
            <p className="text-xs text-muted-foreground mt-2">You need internet to search Scripture.</p>
          )}
          {error && (
            <p className="text-sm text-destructive mt-3" role="alert">{error}</p>
          )}
        </section>

        {!result && !busy && (
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Common issues
            </h2>
            <div className="flex flex-wrap gap-2">
              {LIFE_GUIDE_STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => {
                    setIssue(starter);
                    void search(starter);
                  }}
                  disabled={busy || !bibleId || !online}
                  className="text-left text-[13px] leading-snug px-3 py-2 rounded-xl bg-muted/60 hover:bg-muted border border-border/50 transition disabled:opacity-50"
                >
                  {starter}
                </button>
              ))}
            </div>
          </section>
        )}

        {!result && recent.length > 0 && (
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Recent
            </h2>
            <ul className="space-y-2">
              {recent.map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => handleLoadRecent(session)}
                    className="w-full text-left rounded-xl border border-border bg-card px-4 py-3 hover:border-foreground/20 transition"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                      {session.result.topic}
                      {session.followups?.length ? ` · ${session.followups.length} follow-up${session.followups.length === 1 ? "" : "s"}` : ""}
                      {" · "}
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                    <p className="text-sm line-clamp-2">{session.issue}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {result && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Ask about something else
              </Button>
              <LifeGuideActions
                saveBusy={saveBusy}
                journalEntryId={journalEntryId}
                playbookId={playbookId}
                onSaveJournal={() => void handleSaveJournal()}
                onSavePlaybook={() => void handleSavePlaybook()}
                disabled={!online}
              />
            </div>
            <LifeGuideResult result={result} />
            <LifeGuideFollowUpPanel
              followups={followups}
              busy={followUpBusy}
              onAsk={(q) => void askFollowUp(q)}
            />
          </>
        )}
    </MobilePageShell>
  );
}
