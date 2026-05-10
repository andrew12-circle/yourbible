import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import ForceGraph2D from "react-force-graph-2d";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_LAYERS, LAYER_META, FrameworkLayer } from "@/data/framework";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";

interface BeliefRow {
  id: string;
  layer: string;
  topic: string;
  statement: string;
  confidence: number;
}
interface LinkRow {
  a_id: string;
  b_id: string;
  relation: string;
}
interface ClaimRow {
  id: string;
  claim: string;
  matched_belief_id: string | null;
  match_relation: string | null;
  artifact_id: string;
}

type GraphNode = {
  id: string;
  label: string;
  kind: "belief" | "claim";
  layer?: FrameworkLayer;
  color: string;
  val: number;
  beliefId?: string;
  artifactId?: string;
};
type GraphLink = {
  source: string;
  target: string;
  relation: string;
  color: string;
};

function relationColor(rel: string): string {
  const r = rel.toLowerCase();
  if (r.includes("contradict") || r === "disagree") return "hsl(0 60% 55%)";
  if (r.includes("support") || r === "agree") return "hsl(150 45% 45%)";
  if (r === "new") return "hsl(40 80% 55%)";
  return "hsl(220 10% 55%)";
}

export default function BeliefGraphPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [beliefs, setBeliefs] = useState<BeliefRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [showClaims, setShowClaims] = useState(true);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: b }, { data: l }, { data: c }] = await Promise.all([
        supabase
          .from("belief_nodes")
          .select("id,layer,topic,statement,confidence")
          .eq("user_id", user.id),
        supabase
          .from("belief_links")
          .select("a_id,b_id,relation")
          .eq("user_id", user.id),
        supabase
          .from("artifact_claims")
          .select("id,claim,matched_belief_id,match_relation,artifact_id")
          .eq("user_id", user.id)
          .not("matched_belief_id", "is", null),
      ]);
      setBeliefs((b as BeliefRow[]) ?? []);
      setLinks((l as LinkRow[]) ?? []);
      setClaims((c as ClaimRow[]) ?? []);
    })();
  }, [user]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => {
    const nodes: GraphNode[] = beliefs.map((b) => ({
      id: `b:${b.id}`,
      label: b.statement,
      kind: "belief",
      layer: b.layer as FrameworkLayer,
      color: LAYER_META[b.layer as FrameworkLayer]?.tone ?? "hsl(220 10% 55%)",
      val: 4 + (b.confidence / 100) * 6,
      beliefId: b.id,
    }));
    const linkRows: GraphLink[] = links.map((l) => ({
      source: `b:${l.a_id}`,
      target: `b:${l.b_id}`,
      relation: l.relation,
      color: relationColor(l.relation),
    }));
    if (showClaims) {
      for (const c of claims) {
        if (!c.matched_belief_id) continue;
        const cid = `c:${c.id}`;
        nodes.push({
          id: cid,
          label: c.claim,
          kind: "claim",
          color: "hsl(220 10% 70%)",
          val: 2.5,
          artifactId: c.artifact_id,
        });
        linkRows.push({
          source: cid,
          target: `b:${c.matched_belief_id}`,
          relation: c.match_relation ?? "related",
          color: relationColor(c.match_relation ?? ""),
        });
      }
    }
    return { nodes, links: linkRows };
  }, [beliefs, links, claims, showClaims]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FrameworkLayout title="Belief Graph" back="/framework">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex flex-wrap gap-2 text-[11px]">
          {ALL_LAYERS.map((layer) => (
            <span
              key={layer}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: LAYER_META[layer].tone }}
              />
              {LAYER_META[layer].title}
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant={showClaims ? "default" : "outline"}
            onClick={() => setShowClaims((s) => !s)}
          >
            {showClaims ? "Hide claims" : "Show claims"}
          </Button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative w-full h-[70vh] rounded-lg border border-border bg-card overflow-hidden"
      >
        {data.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
            No beliefs yet. Run the interview to start building your graph.
          </div>
        ) : (
          <ForceGraph2D
            graphData={data}
            width={size.w}
            height={size.h}
            backgroundColor="transparent"
            nodeRelSize={4}
            linkColor={(l: any) => l.color}
            linkWidth={1}
            linkDirectionalParticles={0}
            cooldownTicks={120}
            onNodeClick={(n: any) => setSelected(n as GraphNode)}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const n = node as GraphNode & { x: number; y: number };
              const r = n.val;
              ctx.beginPath();
              ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = n.color;
              ctx.globalAlpha = n.kind === "claim" ? 0.7 : 1;
              ctx.fill();
              ctx.globalAlpha = 1;
              if (globalScale > 1.2 || n.kind === "belief") {
                const fontSize = Math.max(10 / globalScale, 3);
                ctx.font = `${fontSize}px ui-sans-serif, system-ui`;
                ctx.fillStyle = "hsl(var(--foreground))";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                const label =
                  n.label.length > 40 ? n.label.slice(0, 38) + "…" : n.label;
                ctx.fillText(label, n.x, n.y + r + 1);
              }
            }}
          />
        )}

        {selected && (
          <div className="absolute top-3 right-3 max-w-[18rem] rounded-lg border border-border bg-background/95 backdrop-blur p-3 shadow-lg">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
              {selected.kind === "belief"
                ? selected.layer
                  ? LAYER_META[selected.layer].title
                  : "Belief"
                : "Artifact claim"}
            </div>
            <div className="text-sm leading-snug mb-3">{selected.label}</div>
            <div className="flex gap-2">
              {selected.kind === "belief" && selected.beliefId && (
                <Button
                  size="sm"
                  onClick={() =>
                    navigate(`/framework/beliefs/${selected.beliefId}`)
                  }
                >
                  Open belief
                </Button>
              )}
              {selected.kind === "claim" && selected.artifactId && (
                <Button
                  size="sm"
                  onClick={() =>
                    navigate(`/framework/artifacts/${selected.artifactId}`)
                  }
                >
                  Open artifact
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Node size = confidence. Edge color: green = supports/agree, red =
        contradicts/disagree, gold = new claim, gray = related.
      </p>
    </FrameworkLayout>
  );
}