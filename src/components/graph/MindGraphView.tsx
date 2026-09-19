import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { Loader2, Network, Orbit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMindGraphData } from "@/hooks/useMindGraphData";
import { MindSpaceBoundary } from "@/components/graph/space/MindSpaceBoundary";
import { Button } from "@/components/ui/button";
const MindSpaceDialog = lazy(() => import("@/components/graph/space/MindSpaceDialog"));
import {
  buildUnifiedMindGraph,
  DEFAULT_MIND_GRAPH_FILTERS,
  MIND_GRAPH_PALETTE,
  mindNodeRoute,
  pruneMindGraphToEntryRoots,
  type MindGraphFilters,
  type MindGraphNode,
} from "@/lib/graph/unifiedMindGraph";
import { MIND_GRAPH_FILTER_LABELS, MindGraphFiltersMenu } from "@/components/graph/MindGraphFiltersMenu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Props {
  journalId?: string | null;
  className?: string;
  /** Fixed height when `fill` is false (e.g. journal tab). */
  heightClassName?: string;
  /** Grow the canvas to fill the parent flex column. */
  fill?: boolean;
  /** Extra rows in the mobile options sheet (e.g. belief graph tools). */
  menuExtra?: ReactNode;
}

export default function MindGraphView({
  journalId = null,
  className,
  heightClassName = "calc(100svh - 18rem)",
  fill = false,
  menuExtra,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { raw, busy, blocked, error, retry, sessionKey } = useMindGraphData(user?.id, journalId);
  const [spaceSession, setSpaceSession] = useState<string | null>(null);
  const spaceOpen = spaceSession === sessionKey && Boolean(raw) && !blocked;
  const spaceButtonRef = useRef<HTMLButtonElement>(null);
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

  const graphData = useMemo(() => {
    if (!raw) return { nodes: [], links: [] };
    const built = buildUnifiedMindGraph(raw, filters);
    if (!journalId) return built;
    // Compute journal reachability before type filters hide the entry roots.
    const scoped = pruneMindGraphToEntryRoots(buildUnifiedMindGraph(raw, { entry: true, belief: true, artifact: true, entity: true, verse: true, claim: true }), raw.entries.map((entry) => entry.id));
    const keep = new Set(scoped.nodes.map((node) => node.id));
    return { nodes: built.nodes.filter((node) => keep.has(node.id)), links: built.links.filter((link) => keep.has(link.source) && keep.has(link.target)) };
  }, [raw, filters, journalId]);
  const mapData = useMemo(() => ({ nodes: graphData.nodes.map((node) => ({ ...node })), links: graphData.links.map((link) => ({ ...link })) }), [graphData]);
  useEffect(() => {
    if (spaceOpen) fgRef.current?.pauseAnimation();
    else fgRef.current?.resumeAnimation();
  }, [spaceOpen, mapData]);

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
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-2">
        <div className="min-w-0"><p className="text-sm font-medium">Step inside your mind map</p><p className="hidden text-xs text-muted-foreground sm:block">Explore thoughts in space and follow their saved connections.</p></div>
        <Button ref={spaceButtonRef} type="button" className="min-h-11 shrink-0 gap-2" disabled={!raw || blocked || busy} onClick={() => setSpaceSession(sessionKey)}><Orbit className="h-4 w-4" />Enter space</Button>
      </div>
      {spaceOpen ? <MindSpaceBoundary onClose={() => setSpaceSession(null)}><Suspense fallback={<p role="status" className="p-3 text-sm">Opening mind space…</p>}>
        <MindSpaceDialog key={sessionKey} graph={graphData} filters={filters} onToggleFilter={toggle}
          onResetFilters={() => setFilters(DEFAULT_MIND_GRAPH_FILTERS)} returnFocusRef={spaceButtonRef} journalScoped={Boolean(journalId)}
          onClose={() => setSpaceSession(null)} onOpenNode={(node) => navigate(mindNodeRoute(node))} />
      </Suspense></MindSpaceBoundary> : null}
      {!fill ? (
        <>
          <div className="hidden flex-wrap items-center gap-x-4 gap-y-2 px-1 md:flex">
            {MIND_GRAPH_FILTER_LABELS.map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-2">
                <Switch
                  id={`mind-filter-${key}`}
                  checked={filters[key]}
                  onCheckedChange={() => toggle(key)}
                />
                <Label htmlFor={`mind-filter-${key}`} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  {label}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 px-1 md:hidden">
            <p className="min-w-0 truncate text-[11px] text-muted-foreground">{statsLine}</p>
            <MindGraphFiltersMenu
              filters={filters}
              onToggle={toggle}
              statsLine={statsLine}
              menuExtra={menuExtra}
            />
          </div>
        </>
      ) : null}

      {blocked ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Unlock your journal to explore its connections.</p>
      ) : error ? (
        <div className="p-8 text-center" role="alert"><p>Couldn’t load your mind map. Your saved connections are unchanged.</p><Button className="mt-3 min-h-11" variant="outline" onClick={retry}>Retry loading map</Button></div>
      ) : busy ? (
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
            <>
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2 md:hidden">
                <p className="min-w-0 truncate text-[11px] text-muted-foreground">{statsLine}</p>
                <MindGraphFiltersMenu
                  filters={filters}
                  onToggle={toggle}
                  statsLine={statsLine}
                  menuExtra={menuExtra}
                />
              </div>
              <div className="hidden shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/60 bg-muted/30 px-3 py-2 md:flex">
                {MIND_GRAPH_FILTER_LABELS.map(({ key, label, color }) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <Switch
                      id={`mind-filter-${key}`}
                      checked={filters[key]}
                      onCheckedChange={() => toggle(key)}
                    />
                    <Label
                      htmlFor={`mind-filter-${key}`}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground"
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      {label}
                    </Label>
                  </div>
                ))}
                <p className="ml-auto text-[11px] text-muted-foreground">{statsLine}</p>
              </div>
            </>
          ) : (
            <p className="shrink-0 px-3 pt-2 text-[12px] text-muted-foreground">{statsLine}</p>
          )}
          <div ref={canvasRef} className="relative min-h-0 min-w-0 flex-1">
            <ForceGraph2D
              ref={fgRef}
              width={canvasSize.w}
              height={Math.max(canvasSize.h, 280)}
              graphData={mapData}
              nodeId="id"
              nodeVal="val"
              nodeColor="color"
              linkColor={(l) => (l as { color?: string }).color ?? "rgba(28, 28, 30, 0.2)"}
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
                ctx.fillStyle = MIND_GRAPH_PALETTE.black;
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
