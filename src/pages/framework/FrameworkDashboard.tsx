import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronRight, Plus, FileStack, AlertTriangle, Sparkles } from "lucide-react";
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
    <FrameworkLayout title="Belief Architecture Engine">
      <section className="mb-10 rounded-3xl border border-border/60 bg-card/70 backdrop-blur p-6 sm:p-7 shadow-sm">
        <p className="text-base text-foreground/85 max-w-2xl mb-5 leading-relaxed">
          Shape a clear model of what you believe. Capture convictions, pressure-test them against
          scripture, and trace how teachings, relationships, and life moments are forming your worldview.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => setQuickOpen(true)}>
            <Sparkles className="w-4 h-4 mr-1" /> Capture a belief
          </Button>
          <Button asChild>
            <Link to="/framework/artifacts">
              <FileStack className="w-4 h-4 mr-1" /> Artifacts
            </Link>
          </Button>
          <Button asChild>
            <Link to="/framework/artifacts/new?mode=youtube">
              <Plus className="w-4 h-4 mr-1" /> Add an artifact
            </Link>
          </Button>
          <Button variant="outline" className="bg-background/80" asChild>
            <Link to="/framework/beliefs">
              All beliefs ({totalBeliefs})
            </Link>
          </Button>
          <Button variant="outline" className="bg-background/80" asChild>
            <Link to="/framework/tensions">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Tensions{openTensions ? ` (${openTensions})` : ""}
            </Link>
          </Button>
        </div>
      </section>

      <QuickBeliefDialog open={quickOpen} onOpenChange={setQuickOpen} />

      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Belief Interview
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {ALL_LAYERS.map((layer) => {
            const meta = LAYER_META[layer];
            const total = FRAMEWORK_QUESTIONS[layer].length;
            const answered = beliefs.filter((b) => b.layer === layer).length;
            const pct = total ? Math.round((answered / total) * 100) : 0;
            return (
              <Link
                key={layer}
                to={`/framework/interview/${layer}`}
                className="group block rounded-2xl border border-border/70 bg-card/80 p-5 hover:border-foreground/30 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div
                      className="text-[10px] uppercase tracking-[0.18em] font-semibold"
                      style={{ color: meta.tone }}
                    >
                      Layer
                    </div>
                    <div className="font-display text-lg leading-tight">{meta.title}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">{meta.subtitle}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted/80 overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${pct}%`, background: meta.tone }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {answered}/{total}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Recent Artifacts
          </h2>
          <Link to="/framework/artifacts" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all
          </Link>
        </div>
        {busy ? null : recentArtifacts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <FileStack className="w-5 h-5 mx-auto mb-2 opacity-60" />
            Paste a sermon, podcast transcript, or your own journal entry and
            see how it lines up with what you believe.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card/70 overflow-hidden">
            {recentArtifacts.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/framework/artifacts/${a.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted text-sm"
                >
                  <span className="truncate">{a.title || "Untitled"}</span>
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
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
