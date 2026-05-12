import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import FrameworkLayout from "./FrameworkLayout";
import QuickBeliefDialog from "@/components/framework/QuickBeliefDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildJourneyEvents,
  clusterJourneyEvents,
  filterEventsByCategories,
  uniqueInfluenceCount,
  type ArtifactRow,
  type BeliefNodeRow,
  type BeliefSourceRow,
  type BeliefTensionRow,
  type BeliefVersionRow,
  type JournalRow,
} from "./faithJourney/faithJourneyBuild";
import FaithJourneyTimeline from "./faithJourney/FaithJourneyTimeline";
import type { JourneyCategory, JourneyEvent } from "./faithJourney/faithJourneyTypes";
import { JOURNEY_CATEGORY_LABELS } from "./faithJourney/faithJourneyTypes";

const ZOOM_STEP = 1.14;
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 2.8;

const defaultToggles: Record<JourneyCategory, boolean> = {
  beliefs: true,
  journal: true,
  artifacts: true,
  influences: true,
  tensions: true,
};

export default function FaithJourneyPage() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const vertical = isMobile;

  const [busy, setBusy] = useState(true);
  const [beliefs, setBeliefs] = useState<BeliefNodeRow[]>([]);
  const [versions, setVersions] = useState<BeliefVersionRow[]>([]);
  const [journals, setJournals] = useState<JournalRow[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactRow[]>([]);
  const [sources, setSources] = useState<BeliefSourceRow[]>([]);
  const [tensions, setTensions] = useState<BeliefTensionRow[]>([]);

  const [toggles, setToggles] = useState<Record<JourneyCategory, boolean>>(defaultToggles);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [expandedClusterIds, setExpandedClusterIds] = useState<Set<string>>(() => new Set());
  const [beliefDialogOpen, setBeliefDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    (async () => {
      const [
        { data: b, error: eb },
        { data: v, error: ev },
        { data: j, error: ej },
        { data: a, error: ea },
        { data: s, error: es },
        { data: t, error: et },
      ] = await Promise.all([
        supabase.from("belief_nodes").select("id,layer,topic,statement,created_at").eq("user_id", user.id),
        supabase.from("belief_versions").select("id,belief_id,created_at,snapshot").eq("user_id", user.id),
        supabase
          .from("journal_entries")
          .select("id,title,body,entry_at_ts,created_at")
          .eq("user_id", user.id)
          .or("entry_kind.is.null,entry_kind.neq.vent"),
        supabase.from("artifacts").select("id,title,kind,status,created_at").eq("user_id", user.id),
        supabase.from("belief_sources").select("id,belief_id,source_type,label,created_at").eq("user_id", user.id),
        supabase.from("belief_tensions").select("id,status,summary,created_at,updated_at").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      if (eb || ev || ej || ea || es || et) {
        setBeliefs([]);
        setVersions([]);
        setJournals([]);
        setArtifacts([]);
        setSources([]);
        setTensions([]);
      } else {
        setBeliefs((b as BeliefNodeRow[]) ?? []);
        setVersions((v as BeliefVersionRow[]) ?? []);
        setJournals((j as JournalRow[]) ?? []);
        setArtifacts((a as ArtifactRow[]) ?? []);
        setSources((s as BeliefSourceRow[]) ?? []);
        setTensions((t as BeliefTensionRow[]) ?? []);
      }
      setBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const allEvents: JourneyEvent[] = useMemo(
    () =>
      buildJourneyEvents({
        beliefs,
        beliefVersions: versions,
        journals,
        artifacts,
        beliefSources: sources,
        tensions,
      }),
    [beliefs, versions, journals, artifacts, sources, tensions],
  );

  const filteredEvents = useMemo(() => filterEventsByCategories(allEvents, toggles), [allEvents, toggles]);

  const clusters = useMemo(() => clusterJourneyEvents(filteredEvents), [filteredEvents]);

  const stats = useMemo(
    () => ({
      beliefs: beliefs.length,
      journals: journals.length,
      artifacts: artifacts.length,
      influences: uniqueInfluenceCount(sources),
    }),
    [beliefs.length, journals.length, artifacts.length, sources],
  );

  const toggleCategory = useCallback((cat: JourneyCategory) => {
    setToggles((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const onToggleCluster = useCallback((id: string) => {
    setExpandedClusterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const zoomIn = useCallback(() => {
    setZoomFactor((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP));
  }, []);
  const zoomOut = useCallback(() => {
    setZoomFactor((z) => Math.max(ZOOM_MIN, z / ZOOM_STEP));
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const showEmpty = !busy && allEvents.length === 0;
  const showFilteredEmpty = !busy && allEvents.length > 0 && filteredEvents.length === 0;

  return (
    <FrameworkLayout back="/framework" contentClassName="max-w-5xl md:max-w-[min(100%,1120px)]">
      <QuickBeliefDialog open={beliefDialogOpen} onOpenChange={setBeliefDialogOpen} />

      <div className="mb-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">MY FRAMEWORK</p>
          <h1 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-foreground md:text-[2.65rem] md:leading-[1.08]">
            Your faith journey
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Every belief, journal entry, and influence that’s shaped you — on one line.
          </p>
        </div>
        <div
          className="shrink-0 text-right text-[13px] tabular-nums text-muted-foreground md:pb-1"
          aria-label="Journey totals"
        >
          <span className="text-foreground/90 font-medium">{stats.beliefs}</span> beliefs ·{" "}
          <span className="text-foreground/90 font-medium">{stats.journals}</span> journal entries ·{" "}
          <span className="text-foreground/90 font-medium">{stats.artifacts}</span> artifacts ·{" "}
          <span className="text-foreground/90 font-medium">{stats.influences}</span> influences
        </div>
      </div>

      {busy ? (
        <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="text-sm">Loading your journey…</span>
        </div>
      ) : showEmpty ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-14 text-center shadow-sm">
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            Nothing on your timeline yet. Capture a belief or write in your journal — your journey starts with a single
            moment.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" className="rounded-full px-6 shadow-sm" onClick={() => setBeliefDialogOpen(true)}>
              Capture a belief
            </Button>
            <Button type="button" variant="outline" className="rounded-full border-border/70 px-6 shadow-sm" asChild>
              <Link to="/journal/new">Write a journal entry</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Density</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(JOURNEY_CATEGORY_LABELS) as JourneyCategory[]).map((cat) => {
                const on = toggles[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                      on
                        ? "border-border/60 bg-background text-foreground shadow-sm ring-1 ring-black/[0.04]"
                        : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                    )}
                    aria-pressed={on}
                  >
                    {JOURNEY_CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {showFilteredEmpty ? (
            <p className="mb-6 text-sm text-muted-foreground">No events match the filters you selected. Turn a category back on to see those moments.</p>
          ) : null}

          {!showFilteredEmpty && (
            <FaithJourneyTimeline
              clusters={clusters}
              vertical={vertical}
              zoomFactor={zoomFactor}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              expandedClusterIds={expandedClusterIds}
              onToggleCluster={onToggleCluster}
            />
          )}
        </>
      )}
    </FrameworkLayout>
  );
}
