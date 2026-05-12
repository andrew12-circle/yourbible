import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronRight, Plus, FileStack, AlertTriangle, Sparkles, CircleHelp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_LAYERS, FRAMEWORK_QUESTIONS, LAYER_META } from "@/data/framework";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import QuickBeliefDialog from "@/components/framework/QuickBeliefDialog";

interface BeliefRow {
  id: string;
  layer: string;
  topic: string;
}

export default function FrameworkDashboard() {
  const { user, loading } = useAuth();
  const [beliefs, setBeliefs] = useState<BeliefRow[]>([]);
  const [recentArtifacts, setRecentArtifacts] = useState<
    { id: string; title: string | null; created_at: string; status: string }[]
  >([]);
  const [openTensions, setOpenTensions] = useState(0);
  const [busy, setBusy] = useState(true);
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: b }, { data: a }, { count: tCount }] = await Promise.all([
        supabase.from("belief_nodes").select("id,layer,topic").eq("user_id", user.id),
        supabase
          .from("artifacts")
          .select("id,title,created_at,status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("belief_tensions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "open"),
      ]);
      setBeliefs((b as BeliefRow[]) ?? []);
      setRecentArtifacts((a as typeof recentArtifacts) ?? []);
      setOpenTensions(tCount ?? 0);
      setBusy(false);
    })();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const totalBeliefs = beliefs.length;

  return (
    <FrameworkLayout title="Overview">
      <section className="mb-10 sm:mb-12">
        <p className="text-[15px] sm:text-base text-muted-foreground leading-relaxed max-w-[34rem] mb-8 font-normal tracking-tight">
          A living map of what you actually believe — examined, sourced, and
          tested against scripture. Start with the interview, then run sermons,
          podcasts, and journal entries through the analyzer.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-2.5">
          <Button
            onClick={() => setQuickOpen(true)}
            className="rounded-xl shadow-sm w-full sm:w-auto shrink-0"
          >
            <Sparkles className="w-4 h-4" /> Capture a belief
          </Button>
          <div className="flex flex-wrap gap-2 sm:gap-2.5 w-full sm:flex-1 min-w-0 sm:min-w-[12rem]">
            <Button variant="secondary" className="rounded-xl flex-1 min-w-[8.5rem] sm:flex-initial" asChild>
              <Link to="/framework/artifacts">
                <FileStack className="w-4 h-4" /> Artifacts
              </Link>
            </Button>
            <Button variant="secondary" className="rounded-xl flex-1 min-w-[8.5rem] sm:flex-initial" asChild>
              <Link to="/framework/artifacts/new?mode=youtube">
                <Plus className="w-4 h-4" /> Add artifact
              </Link>
            </Button>
            <Button variant="ghost" className="rounded-xl border border-border/50 bg-background/60 flex-1 min-w-[8.5rem] sm:flex-initial hover:bg-muted/60" asChild>
              <Link to="/framework/artifacts/new?mode=text&template=question">
                <CircleHelp className="w-4 h-4" /> Question inbox
              </Link>
            </Button>
            <Button variant="ghost" className="rounded-xl border border-border/50 bg-background/60 flex-1 min-w-[8.5rem] sm:flex-initial hover:bg-muted/60" asChild>
              <Link to="/framework/beliefs">All beliefs ({totalBeliefs})</Link>
            </Button>
            <Button variant="ghost" className="rounded-xl border border-border/50 bg-background/60 flex-1 min-w-[8.5rem] sm:flex-initial hover:bg-muted/60" asChild>
              <Link to="/framework/tensions">
                <AlertTriangle className="w-4 h-4" />
                Tensions{openTensions ? ` (${openTensions})` : ""}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <QuickBeliefDialog open={quickOpen} onOpenChange={setQuickOpen} />

      <section className="mb-10 sm:mb-12 rounded-2xl border border-border/50 bg-card/40 p-5 sm:p-6 shadow-sm ring-1 ring-border/30">
        <h2 className="text-[13px] font-medium text-foreground tracking-tight mb-6">
          Belief interview
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {ALL_LAYERS.map((layer) => {
            const meta = LAYER_META[layer];
            const total = FRAMEWORK_QUESTIONS[layer].length;
            const answered = beliefs.filter((b) => b.layer === layer).length;
            const pct = total ? Math.round((answered / total) * 100) : 0;
            return (
              <Link
                key={layer}
                to={`/framework/interview/${layer}`}
                className="group block rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card/40"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div
                      className="text-[11px] font-medium uppercase tracking-wide mb-1"
                      style={{ color: meta.tone }}
                    >
                      Layer
                    </div>
                    <div className="text-lg font-semibold leading-snug tracking-tight text-foreground">
                      {meta.title}
                    </div>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 shrink-0 text-muted-foreground/70 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-transform duration-200"
                    aria-hidden
                  />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{meta.subtitle}</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-muted/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-300 ease-out opacity-90"
                      style={{ width: `${pct}%`, background: meta.tone }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums font-medium shrink-0">
                    {answered}/{total}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border/50 bg-card/40 p-5 sm:p-6 shadow-sm ring-1 ring-border/30">
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <h2 className="text-[13px] font-medium text-foreground tracking-tight">Recent artifacts</h2>
          <Link
            to="/framework/artifacts"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-sm"
          >
            View all
          </Link>
        </div>
        {busy ? null : recentArtifacts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            <FileStack className="w-5 h-5 mx-auto mb-3 text-muted-foreground/60" aria-hidden />
            Paste a sermon, podcast transcript, or your own journal entry and
            see how it lines up with what you believe.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {recentArtifacts.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/framework/artifacts/${a.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-transparent px-4 py-3.5 text-sm bg-background/50 hover:bg-muted/40 hover:border-border/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card/40"
                >
                  <span className="truncate font-medium text-foreground/90">{a.title || "Untitled"}</span>
                  <span className="text-xs text-muted-foreground tabular-nums capitalize shrink-0 font-medium">
                    {a.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </FrameworkLayout>
  );
}