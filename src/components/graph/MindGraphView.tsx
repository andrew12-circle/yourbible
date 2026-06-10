import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { Loader2, Network } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUnifiedMindGraph } from "@/lib/graph/fetchUnifiedMindGraph";
import {
  buildUnifiedMindGraph,
  DEFAULT_MIND_GRAPH_FILTERS,
  mindNodeRoute,
  pruneMindGraphToEntryRoots,
  type MindGraphFilters,
  type MindGraphNode,
} from "@/lib/graph/unifiedMindGraph";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const FILTER_LABELS: { key: keyof MindGraphFilters; label: string }[] = [
  { key: "entry", label: "Journal" },
  { key: "belief", label: "Beliefs" },
  { key: "artifact", label: "Videos & books" },
  { key: "entity", label: "People" },
  { key: "verse", label: "Scripture" },
  { key: "claim", label: "Claims" },
];

interface Props {
  journalId?: string | null;
  className?: string;
  heightClassName?: string;
}

export default function MindGraphView({
  journalId = null,
  className,
  heightClassName = "min(72vh, 600px)",
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(true);
  const [raw, setRaw] = useState<Awaited<ReturnType<typeof fetchUnifiedMindGraph>> | null>(null);
  const [filters, setFilters] = useState<MindGraphFilters>(DEFAULT_MIND_GRAPH_FILTERS);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 520 });
  const [hover, setHover] = useState<MindGraphNode | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    fetchUnifiedMindGraph(user.id, { journalId })
      .then((data) => {
        setRaw(data);
        setBusy(false);
      })
      .catch(() => setBusy(false));
  }, [user, journalId]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const sync = () => setCanvasSize({ w: el.clientWidth, h: Math.max(el.clientHeight, 360) });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    if (!raw) return { nodes: [], links: [] };
    const built = buildUnifiedMindGraph(raw, filters);
    if (!journalId) return built;
    return pruneMindGraphToEntryRoots(
      built,
      raw.entries.map((e) => e.id),
    );
  }, [raw, filters, journalId]);

  const handleNodeClick = useCallback(
    (node: object) => {
      navigate(mindNodeRoute(node as MindGraphNode));
    },
    [navigate],
  );

  const toggle = (key: keyof MindGraphFilters) => {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  };

  const connected = graphData.nodes.filter((n) => n.val > 2).length;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
        {FILTER_LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Switch
              id={`mind-filter-${key}`}
              checked={filters[key]}
              onCheckedChange={() => toggle(key)}
            />
            <Label htmlFor={`mind-filter-${key}`} className="text-[12px] text-muted-foreground">
              {label}
            </Label>
          </div>
        ))}
      </div>

      {busy ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : graphData.nodes.length === 0 ? (
        <div className="text-center py-16 px-6">
          <Network className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-lg font-semibold tracking-tight">Your mind map is empty</p>
          <p className="text-[15px] text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
            Journal, save artifacts, form beliefs, and link them with{" "}
            <code className="text-[13px] bg-muted px-1 rounded">[[wikilinks]]</code> — everything
            connects here.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[12px] text-muted-foreground px-1">
            {graphData.nodes.length} nodes · {graphData.links.length} connections
            {connected > 0 ? ` · ${connected} linked` : ""}
            {journalId ? " · journal scope" : ""}
          </p>
          <div
            ref={hostRef}
            className="relative overflow-hidden rounded-2xl border border-border bg-card"
            style={{ height: heightClassName }}
          >
            <ForceGraph2D
              ref={fgRef}
              width={canvasSize.w}
              height={canvasSize.h}
              graphData={graphData}
              nodeId="id"
              nodeVal="val"
              nodeColor="color"
              linkColor={(l) => (l as { color?: string }).color ?? "hsla(270 30% 50% / 0.28)"}
              linkWidth={1}
              cooldownTicks={100}
              onNodeClick={handleNodeClick}
              onNodeHover={(n) => setHover(n ? (n as MindGraphNode) : null)}
              nodePointerAreaPaint={(node, color, ctx, globalScale) => {
                const n = node as MindGraphNode & { x: number; y: number };
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.val + 3 / globalScale, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
              }}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const n = node as MindGraphNode & { x: number; y: number };
                const r = n.val;
                const active = hover?.id === n.id;
                ctx.beginPath();
                ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
                ctx.fillStyle = n.color;
                ctx.globalAlpha = active ? 1 : 0.9;
                ctx.fill();
                ctx.globalAlpha = 1;
                if (globalScale < 0.55 && !active) return;
                const fontSize = Math.max(8 / globalScale, 2.8);
                ctx.font = `${fontSize}px ui-sans-serif, system-ui`;
                ctx.fillStyle = "hsl(var(--foreground))";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                const label = n.label.length > 32 ? `${n.label.slice(0, 31)}…` : n.label;
                ctx.fillText(label, n.x, n.y + r + 2);
              }}
            />
          </div>
          {hover && (
            <p className="text-[12px] text-muted-foreground px-1">
              <span className="capitalize">{hover.kind}</span> · {hover.label} — click to open
            </p>
          )}
        </>
      )}

      <p className="text-[11px] text-muted-foreground px-1 leading-relaxed">
        Link while writing:{" "}
        <code className="bg-muted px-1 rounded">[[entry title]]</code>{" "}
        <code className="bg-muted px-1 rounded">[[video:Title]]</code>{" "}
        <code className="bg-muted px-1 rounded">[[belief:…]]</code>{" "}
        <code className="bg-muted px-1 rounded">[[person:Name]]</code>{" "}
        <code className="bg-muted px-1 rounded">[[verse:John 3:16]]</code>
      </p>
    </div>
  );
}
