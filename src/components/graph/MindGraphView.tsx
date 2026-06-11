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
  /** Fixed height when `fill` is false (e.g. journal tab). */
  heightClassName?: string;
  /** Grow the canvas to fill the parent flex column. */
  fill?: boolean;
}

export default function MindGraphView({
  journalId = null,
  className,
  heightClassName = "calc(100svh - 18rem)",
  fill = false,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(true);
  const [raw, setRaw] = useState<Awaited<ReturnType<typeof fetchUnifiedMindGraph>> | null>(null);
  const [filters, setFilters] = useState<MindGraphFilters>(DEFAULT_MIND_GRAPH_FILTERS);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 520 });
  const [hover, setHover] = useState<MindGraphNode | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  const fitView = useCallback(
    (padding = fill ? 28 : 48) => {
      fgRef.current?.zoomToFit(400, padding);
    },
    [fill],
  );

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

  const graphData = useMemo(() => {
    if (!raw) return { nodes: [], links: [] };
    const built = buildUnifiedMindGraph(raw, filters);
    if (!journalId) return built;
    return pruneMindGraphToEntryRoots(
      built,
      raw.entries.map((e) => e.id),
    );
  }, [raw, filters, journalId]);

  const hasGraph = !busy && graphData.nodes.length > 0;

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const sync = () => setCanvasSize({ w: el.clientWidth, h: Math.max(el.clientHeight, 280) });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasGraph, fill]);

  useEffect(() => {
    if (!hasGraph || canvasSize.w < 40) return;
    const id = window.setTimeout(() => fitView(), 120);
    return () => window.clearTimeout(id);
  }, [graphData, canvasSize.w, canvasSize.h, hasGraph, fitView]);

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

  const statsLine = `${graphData.nodes.length} nodes · ${graphData.links.length} connections${
    connected > 0 ? ` · ${connected} linked` : ""
  }${journalId ? " · journal scope" : ""}`;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col",
        fill ? "h-full min-h-0 flex-1 gap-2" : "gap-3",
        className,
      )}
    >
      {!fill ? (
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
      ) : null}

      {busy ? (
        <div className="flex flex-1 items-center justify-center py-24">
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
        <div
          className={cn(
            "flex min-h-0 w-full min-w-0 flex-col overflow-hidden border border-border bg-card",
            fill ? "min-h-[280px] flex-1 rounded-lg" : "rounded-2xl",
          )}
          style={fill ? undefined : { height: heightClassName }}
        >
          {fill ? (
            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/60 bg-muted/30 px-3 py-2">
              {FILTER_LABELS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <Switch
                    id={`mind-filter-${key}`}
                    checked={filters[key]}
                    onCheckedChange={() => toggle(key)}
                  />
                  <Label
                    htmlFor={`mind-filter-${key}`}
                    className="text-[11px] text-muted-foreground"
                  >
                    {label}
                  </Label>
                </div>
              ))}
              <p className="ml-auto text-[11px] text-muted-foreground">{statsLine}</p>
            </div>
          ) : (
            <p className="shrink-0 px-3 pt-2 text-[12px] text-muted-foreground">{statsLine}</p>
          )}
          <div ref={canvasRef} className="relative min-h-0 min-w-0 flex-1">
            <ForceGraph2D
              ref={fgRef}
              width={canvasSize.w}
              height={Math.max(canvasSize.h, 280)}
              graphData={graphData}
              nodeId="id"
              nodeVal="val"
              nodeColor="color"
              linkColor={(l) => (l as { color?: string }).color ?? "rgba(0, 122, 255, 0.22)"}
              linkWidth={1}
              cooldownTicks={100}
              onEngineStop={() => fitView()}
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
            {hover ? (
              <p className="pointer-events-none absolute bottom-2 left-3 right-3 z-10 rounded-md border border-border/60 bg-background/85 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-sm supports-[backdrop-filter]:bg-background/75">
                <span className="capitalize">{hover.kind}</span> · {hover.label} — click to open
              </p>
            ) : null}
          </div>
        </div>
      )}

      {!fill ? (
        <p className="text-[11px] text-muted-foreground px-1 leading-relaxed">
          Link while writing:{" "}
          <code className="bg-muted px-1 rounded">[[entry title]]</code>{" "}
          <code className="bg-muted px-1 rounded">[[video:Title]]</code>{" "}
          <code className="bg-muted px-1 rounded">[[belief:…]]</code>{" "}
          <code className="bg-muted px-1 rounded">[[person:Name]]</code>{" "}
          <code className="bg-muted px-1 rounded">[[verse:John 3:16]]</code>
        </p>
      ) : null}
    </div>
  );
}
