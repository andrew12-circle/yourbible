import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Grid3X3, Loader2, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBibles, pickDefaultBibleId } from "@/hooks/useBibles";
import { useCodeLab } from "@/hooks/useCodeLab";
import { getStoredBibleId } from "@/lib/bible/storedBibleId";
import { CodeLabSearchPanel } from "@/components/code-lab/CodeLabSearchPanel";
import { CodeLabHitList, CodeLabMatrixViewer } from "@/components/code-lab/CodeLabResults";
import { CodeLabStatsPanel } from "@/components/code-lab/CodeLabStatsPanel";
import { downloadCodeCard } from "@/lib/code-lab/downloadCodeCard";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import MobilePageShell from "@/components/shell/MobilePageShell";
import { hubShellScrollMain } from "@/lib/shell/hubShellClasses";
import { cn } from "@/lib/utils";

export default function CodeLabPage() {
  const { user, loading: authLoading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const online = useOnlineStatus();
  const { data: bibles = [] } = useBibles("all");
  const [bibleId, setBibleId] = useState(() => pickDefaultBibleId(bibles, getStoredBibleId()) ?? "");

  useEffect(() => {
    if (!bibleId && bibles.length) {
      setBibleId(pickDefaultBibleId(bibles, getStoredBibleId()) ?? bibles[0]!.id);
    }
  }, [bibles, bibleId]);

  const bibleEntry = useMemo(
    () => bibles.find((b) => b.id === bibleId),
    [bibles, bibleId],
  );

  const lab = useCodeLab(bibleId, bibleEntry);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const handleExport = () => {
    const card = lab.buildCodeCard();
    if (card) downloadCodeCard(card);
  };

  const handleDocumentaryPreset = () => {
    const wlcId = lab.applyDocumentaryPreset();
    setBibleId(wlcId);
  };

  return (
    <MobilePageShell
      showHubShell={showHubShell}
      header={
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 pb-3">
          <Link
            to="/home"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
              <h1 className="truncate font-display text-xl text-leather">Code Lab</h1>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Skip-code decoder for any Bible text
            </p>
          </div>
        </div>
      }
      headerClassName="border-border/60 bg-background/90"
      mainClassName={cn(hubShellScrollMain(showHubShell), "mx-auto max-w-3xl space-y-4 px-4 py-5 pb-8")}
    >
      <p className="text-sm text-muted-foreground">
        Explore equidistant letter sequences (ELS). Explore the pattern. Test the pattern. Compare the odds.
      </p>

      {!online && (
        <p className="text-sm text-amber-700 dark:text-amber-400 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          Offline: cached chapters and bundled WLC JSON only.
        </p>
      )}

      <CodeLabSearchPanel
        bibles={bibles}
        bibleId={bibleId}
        onBibleIdChange={setBibleId}
        compareBibleId={lab.compareBibleId}
        onCompareBibleIdChange={lab.setCompareBibleId}
        term={lab.term}
        onTermChange={lab.setTerm}
        minSkip={lab.minSkip}
        onMinSkipChange={lab.setMinSkip}
        maxSkip={lab.maxSkip}
        onMaxSkipChange={lab.setMaxSkip}
        scope={lab.scope}
        onScopeChange={lab.setScope}
        profileOverride={lab.profileOverride}
        onProfileOverrideChange={lab.setProfileOverride}
        onDocumentaryPreset={handleDocumentaryPreset}
      />

      <Button
        type="button"
        className="w-full gap-2"
        disabled={lab.loading || !lab.term.trim() || !bibleId}
        onClick={() => void lab.loadAndSearch()}
      >
        {lab.loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        {lab.loading
          ? lab.progress
            ? `Loading ${lab.progress.current ?? ""} (${lab.progress.loaded}/${lab.progress.total})`
            : "Searching…"
          : `Search ${lab.scopeLabel}`}
      </Button>

      {lab.error && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
          {lab.error}
        </p>
      )}

      {lab.stream && (
        <p className="text-xs text-muted-foreground">
          Loaded {lab.stream.letters.length.toLocaleString()} letters · {lab.stream.segments.length} verses
        </p>
      )}

      <CodeLabHitList
        hits={lab.hits}
        compareHits={lab.compareHits}
        selectedHit={lab.selectedHit}
        onSelect={lab.setSelectedHit}
        hasCompare={!!lab.compareBibleId}
      />

      <CodeLabMatrixViewer
        matrix={lab.matrix}
        profile={lab.profile}
        streamLength={lab.stream?.letters.length ?? 0}
      />

      <CodeLabStatsPanel
        searchCount={lab.searchCount}
        streamLength={lab.stream?.letters.length ?? null}
        controlResult={lab.controlResult}
        profileLabel={lab.profile.label}
        onExport={handleExport}
        onSaveHistory={lab.saveToHistory}
        canExport={!!lab.selectedHit}
      />

      {lab.history.length > 0 && (
        <section className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="text-sm font-medium">Saved findings</h3>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {lab.history.slice(0, 10).map((item) => (
              <li
                key={`${item.createdAt}-${item.hit.startIndex}`}
                className="text-xs text-muted-foreground border-b border-border/50 pb-2 last:border-0"
              >
                <span className="font-medium text-foreground">{item.term}</span>
                {" · "}
                skip {item.hit.skip} · {item.referenceLabel}
                {" · "}
                {item.bibleLabel}
              </li>
            ))}
          </ul>
        </section>
      )}
    </MobilePageShell>
  );
}
