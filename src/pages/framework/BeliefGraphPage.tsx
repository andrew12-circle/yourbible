import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, useNavigate } from "react-router-dom";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Crosshair,
  Keyboard,
  Minus,
  Plus,
  RotateCcw,
  Scan,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_LAYERS, LAYER_META, FrameworkLayer } from "@/data/framework";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BELIEF_GRAPH_LAYOUT_STORAGE_KEY } from "@/lib/graph/beliefGraphConstants";
import { bestFuzzyScore } from "@/lib/graph/beliefGraphFuzzy";
import { buildAdjacency, nHopNeighborSet } from "@/lib/graph/beliefGraphNeighbors";
import { convexHull2D } from "@/lib/graph/beliefGraphConvexHull";
import {
  computeBrainPins,
  computeBrainTargets,
  createBrainBiasForce,
} from "@/lib/graph/beliefGraphBrain";
import { computeRadialPins } from "@/lib/graph/beliefGraphRadial";
import type { Json } from "@/integrations/supabase/types";

interface BeliefRow {
  id: string;
  layer: string;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
  created_at: string;
  updated_at: string;
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
  user_note: string | null;
}

interface VersionRow {
  belief_id: string;
  created_at: string;
  snapshot: Json;
}

type LayoutPreset = "force" | "radial" | "brain" | "hierarchical" | "cluster_topic";
type LabelDensity = "compact" | "detailed" | "none";

type GraphNode = {
  id: string;
  label: string;
  statement: string;
  topic: string;
  answer: string | null;
  kind: "belief" | "claim";
  layer?: FrameworkLayer;
  color: string;
  val: number;
  beliefId?: string;
  artifactId?: string;
  updatedAt?: string;
  confidence?: number;
  matchedBeliefGraphId?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};
type GraphLink = {
  source: string;
  target: string;
  relation: string;
  color: string;
  reason?: string | null;
};

function relationColor(rel: string): string {
  const r = rel.toLowerCase();
  if (r.includes("contradict") || r === "disagree") return "hsl(0 60% 55%)";
  if (r.includes("support") || r === "agree") return "hsl(150 45% 45%)";
  if (r === "new") return "hsl(40 80% 55%)";
  return "hsl(220 10% 55%)";
}

function withAlpha(hsl: string, a: number): string {
  if (hsl.includes("/")) return hsl;
  return hsl.replace(/\)$/, ` / ${a})`);
}

function linkNodeIds(l: { source?: unknown; target?: unknown }): { sid: string; tid: string } {
  const sid =
    typeof l.source === "object" && l.source && "id" in (l.source as object)
      ? String((l.source as { id: string }).id)
      : String(l.source ?? "");
  const tid =
    typeof l.target === "object" && l.target && "id" in (l.target as object)
      ? String((l.target as { id: string }).id)
      : String(l.target ?? "");
  return { sid, tid };
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return `rgba(148,163,184,${alpha})`;
  const r = parseInt(m[1]!, 16);
  const g = parseInt(m[2]!, 16);
  const b = parseInt(m[3]!, 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function readSnapshotFields(s: Json | null): {
  statement?: string;
  confidence?: number;
} {
  if (!s || typeof s !== "object" || Array.isArray(s)) return {};
  const o = s as Record<string, unknown>;
  const statement = typeof o.statement === "string" ? o.statement : undefined;
  const confidence =
    typeof o.confidence === "number" && Number.isFinite(o.confidence)
      ? o.confidence
      : undefined;
  return { statement, confidence };
}

function pickLatestSnapshotBefore(
  rows: VersionRow[],
  beliefId: string,
  asOfMs: number,
): Json | null {
  let best: Json | null = null;
  let bestT = -Infinity;
  for (const r of rows) {
    if (r.belief_id !== beliefId) continue;
    const t = new Date(r.created_at).getTime();
    if (t <= asOfMs && t >= bestT) {
      bestT = t;
      best = r.snapshot;
    }
  }
  return best;
}

function defaultRadialCenter(
  nodes: GraphNode[],
  links: { source: unknown; target: unknown }[],
): string {
  const deg = new Map<string, number>();
  for (const n of nodes) {
    if (n.kind === "belief") deg.set(n.id, 0);
  }
  const bump = (id: string) => deg.set(id, (deg.get(id) ?? 0) + 1);
  for (const l of links) {
    const s =
      typeof l.source === "object" && l.source && "id" in (l.source as object)
        ? String((l.source as { id: string }).id)
        : String(l.source);
    const t =
      typeof l.target === "object" && l.target && "id" in (l.target as object)
        ? String((l.target as { id: string }).id)
        : String(l.target);
    bump(s);
    bump(t);
  }
  let bestId = nodes.find((n) => n.kind === "belief")?.id ?? "";
  let bestD = -1;
  for (const [id, d] of deg) {
    if (d > bestD) {
      bestD = d;
      bestId = id;
    }
  }
  return bestId;
}

type ZoomTransform = { k: number; x: number; y: number };

function BeliefGraphMinimap(props: {
  width: number;
  height: number;
  bbox: { x: [number, number]; y: [number, number] } | null;
  transform: ZoomTransform | null;
  graphWidth: number;
  graphHeight: number;
  samples: { x: number; y: number; c: string }[];
  "aria-label"?: string;
  onNavigate: (gx: number, gy: number) => void;
}) {
  const { width, height, bbox, transform, graphWidth, graphHeight, samples, onNavigate } = props;
  const pad = 6;
  const iw = width - pad * 2;
  const ih = height - pad * 2;
  if (!bbox) {
    return (
      <svg
        width={width}
        height={height}
        className="rounded-md border border-border/80 bg-background/90 shadow-sm"
        aria-hidden
      />
    );
  }
  const [x0, x1] = bbox.x;
  const [y0, y1] = bbox.y;
  const bw = Math.max(x1 - x0, 1e-6);
  const bh = Math.max(y1 - y0, 1e-6);
  const sx = iw / bw;
  const sy = ih / bh;
  const s = Math.min(sx, sy);
  const ox = pad + (iw - bw * s) / 2;
  const oy = pad + (ih - bh * s) / 2;
  const mapX = (gx: number) => ox + (gx - x0) * s;
  const mapY = (gy: number) => oy + (gy - y0) * s;

  let vx = 0;
  let vy = 0;
  let vw = iw;
  let vh = ih;
  if (transform && graphWidth > 0 && graphHeight > 0) {
    const invK = 1 / transform.k;
    const gx0 = (0 - transform.x) * invK;
    const gy0 = (0 - transform.y) * invK;
    const gx1 = (graphWidth - transform.x) * invK;
    const gy1 = (graphHeight - transform.y) * invK;
    const minGX = Math.min(gx0, gx1);
    const maxGX = Math.max(gx0, gx1);
    const minGY = Math.min(gy0, gy1);
    const maxGY = Math.max(gy0, gy1);
    vx = mapX(minGX);
    vy = mapY(minGY);
    vw = Math.max((maxGX - minGX) * s, 2);
    vh = Math.max((maxGY - minGY) * s, 2);
  }

  return (
    <svg
      width={width}
      height={height}
      className="rounded-md border border-border/80 bg-background/90 shadow-sm cursor-pointer transition-opacity duration-200"
      aria-label={props["aria-label"] ?? "Graph minimap; click to pan"}
      role="img"
      onClick={(e) => {
        const rect = (e.target as SVGSVGElement).getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const gx = x0 + (mx - ox) / s;
        const gy = y0 + (my - oy) / s;
        onNavigate(gx, gy);
      }}
    >
      <rect x={0} y={0} width={width} height={height} fill="transparent" />
      {samples.map((p, i) => (
        <circle key={i} cx={mapX(p.x)} cy={mapY(p.y)} r={1.6} fill={p.c} opacity={0.85} />
      ))}
      <rect
        x={vx}
        y={vy}
        width={vw}
        height={vh}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        rx={2}
        pointerEvents="none"
      />
    </svg>
  );
}

export default function BeliefGraphPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  const graphDataRef = useRef<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const searchRef = useRef<HTMLInputElement>(null);
  const hoverRaf = useRef<number | null>(null);
  const pendingHover = useRef<GraphNode | null | undefined>(undefined);
  const pendingLinkHover = useRef<GraphLink | null | undefined>(undefined);
  const timelineInitRef = useRef(false);
  const zoomKRef = useRef(1);

  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 520 });
  const [beliefs, setBeliefs] = useState<BeliefRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [showClaims, setShowClaims] = useState(true);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusDepth, setFocusDepth] = useState(2);
  const [searchRaw, setSearchRaw] = useState("");
  const searchDebounced = useDeferredValue(searchRaw.trim());
  const [searchOpen, setSearchOpen] = useState(false);
  const [labelDensity, setLabelDensity] = useState<LabelDensity>("compact");
  const [layout, setLayout] = useState<LayoutPreset>(() => {
    try {
      const v = localStorage.getItem(BELIEF_GRAPH_LAYOUT_STORAGE_KEY) as LayoutPreset | null;
      if (
        v === "force" ||
        v === "radial" ||
        v === "brain" ||
        v === "hierarchical" ||
        v === "cluster_topic"
      )
        return v;
    } catch {
      /* ignore */
    }
    return "force";
  });
  const [groupByLayer, setGroupByLayer] = useState(false);
  const [groupByTopic, setGroupByTopic] = useState(false);
  const [hiddenLayers, setHiddenLayers] = useState<Set<FrameworkLayer>>(() => new Set());
  const [bbox, setBbox] = useState<{ x: [number, number]; y: [number, number] } | null>(null);
  const [zoomT, setZoomT] = useState<ZoomTransform | null>(null);
  const [minimapSamples, setMinimapSamples] = useState<{ x: number; y: number; c: string }[]>([]);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [hoverLink, setHoverLink] = useState<GraphLink | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [asOfMs, setAsOfMs] = useState<number>(() => Date.now());

  useEffect(() => {
    try {
      localStorage.setItem(BELIEF_GRAPH_LAYOUT_STORAGE_KEY, layout);
    } catch {
      /* ignore */
    }
  }, [layout]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: b }, { data: l }, { data: c }, { data: v }] = await Promise.all([
        supabase
          .from("belief_nodes")
          .select("id,layer,topic,statement,answer,confidence,created_at,updated_at")
          .eq("user_id", user.id),
        supabase.from("belief_links").select("a_id,b_id,relation").eq("user_id", user.id),
        supabase
          .from("artifact_claims")
          .select("id,claim,matched_belief_id,match_relation,artifact_id,user_note")
          .eq("user_id", user.id)
          .not("matched_belief_id", "is", null),
        supabase.from("belief_versions").select("belief_id,created_at,snapshot").eq("user_id", user.id),
      ]);
      setBeliefs((b as BeliefRow[]) ?? []);
      setLinks((l as LinkRow[]) ?? []);
      setClaims((c as ClaimRow[]) ?? []);
      setVersions((v as VersionRow[]) ?? []);
    })();
  }, [user]);

  useEffect(() => {
    const el = canvasHostRef.current;
    if (!el) return;
    const sync = () => setCanvasSize({ w: el.clientWidth, h: el.clientHeight });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const timelineBounds = useMemo(() => {
    const times: number[] = [];
    for (const b of beliefs) {
      times.push(new Date(b.created_at).getTime());
      times.push(new Date(b.updated_at).getTime());
    }
    for (const r of versions) times.push(new Date(r.created_at).getTime());
    if (times.length === 0) return { min: Date.now(), max: Date.now() };
    return { min: Math.min(...times), max: Date.now() };
  }, [beliefs, versions]);

  useEffect(() => {
    if (timelineInitRef.current) return;
    if (beliefs.length === 0 && versions.length === 0) return;
    timelineInitRef.current = true;
    setAsOfMs(timelineBounds.max);
  }, [beliefs.length, versions.length, timelineBounds.max]);

  const data = useMemo(() => {
    const nodes: GraphNode[] = beliefs.map((b) => ({
      id: `b:${b.id}`,
      label: b.statement,
      statement: b.statement,
      topic: b.topic,
      answer: b.answer,
      kind: "belief" as const,
      layer: b.layer as FrameworkLayer,
      color: LAYER_META[b.layer as FrameworkLayer]?.tone ?? "hsl(220 10% 55%)",
      val: 4 + (b.confidence / 100) * 6,
      beliefId: b.id,
      updatedAt: b.updated_at,
      confidence: b.confidence,
    }));
    const linkRows: GraphLink[] = links.map((l) => ({
      source: `b:${l.a_id}`,
      target: `b:${l.b_id}`,
      relation: l.relation,
      color: relationColor(l.relation),
      reason: null,
    }));
    if (showClaims) {
      for (const c of claims) {
        if (!c.matched_belief_id) continue;
        const cid = `c:${c.id}`;
        nodes.push({
          id: cid,
          label: c.claim,
          statement: c.claim,
          topic: "Claim",
          answer: null,
          kind: "claim",
          color: "hsl(220 10% 70%)",
          val: 2.5,
          artifactId: c.artifact_id,
          matchedBeliefGraphId: `b:${c.matched_belief_id}`,
        });
        linkRows.push({
          source: cid,
          target: `b:${c.matched_belief_id}`,
          relation: c.match_relation ?? "related",
          color: relationColor(c.match_relation ?? ""),
          reason: c.user_note,
        });
      }
    }

    const snap = (id: string, beliefUuid: string | undefined) => {
      if (!beliefUuid) return;
      const row = beliefs.find((x) => x.id === beliefUuid);
      if (!row) return;
      const shot = pickLatestSnapshotBefore(versions, beliefUuid, asOfMs);
      const fields = readSnapshotFields(shot);
      const n = nodes.find((x) => x.id === id);
      if (!n || n.kind !== "belief") return;
      if (fields.statement) n.label = fields.statement;
      if (fields.confidence !== undefined) {
        n.confidence = fields.confidence;
        n.val = 4 + (fields.confidence / 100) * 6;
      }
    };

    for (const n of nodes) {
      if (n.kind !== "belief" || !n.beliefId) continue;
      const created = new Date(beliefs.find((b) => b.id === n.beliefId)?.created_at ?? 0).getTime();
      (n as GraphNode & { __future?: boolean }).__future = created > asOfMs;
      snap(n.id, n.beliefId);
    }

    const centerForRadial =
      selected?.kind === "belief" ? selected.id : defaultRadialCenter(nodes, linkRows);

    if (layout === "radial") {
      const pins = computeRadialPins(
        centerForRadial,
        nodes.map((n) => ({
          id: n.id,
          kind: n.kind,
          beliefAnchorId: n.matchedBeliefGraphId,
        })),
        linkRows,
      );
      for (const n of nodes) {
        const p = pins.get(n.id);
        if (p) {
          n.fx = p.fx;
          n.fy = p.fy;
        }
      }
    } else if (layout === "brain") {
      const pins = computeBrainPins(
        nodes.map((n) => ({
          id: n.id,
          kind: n.kind,
          beliefAnchorId: n.matchedBeliefGraphId,
        })),
        linkRows,
      );
      for (const n of nodes) {
        const p = pins.get(n.id);
        if (p) {
          n.fx = p.fx;
          n.fy = p.fy;
        }
      }
    } else {
      for (const n of nodes) {
        delete (n as GraphNode & { fx?: number; fy?: number }).fx;
        delete (n as GraphNode & { fx?: number; fy?: number }).fy;
      }
    }

    return { nodes, links: linkRows };
  }, [
    beliefs,
    links,
    claims,
    showClaims,
    layout,
    selected,
    versions,
    asOfMs,
  ]);

  const brainAttractionTargets = useMemo(() => {
    type BI = { id: string; kind: "belief" | "claim"; beliefAnchorId?: string };
    const nodesForBrain: BI[] = beliefs.map((b) => ({
      id: `b:${b.id}`,
      kind: "belief" as const,
    }));
    const linksForBrain: { source: unknown; target: unknown }[] = links.map((l) => ({
      source: `b:${l.a_id}`,
      target: `b:${l.b_id}`,
    }));
    if (showClaims) {
      for (const c of claims) {
        if (!c.matched_belief_id) continue;
        nodesForBrain.push({
          id: `c:${c.id}`,
          kind: "claim",
          beliefAnchorId: `b:${c.matched_belief_id}`,
        });
        linksForBrain.push({
          source: `c:${c.id}`,
          target: `b:${c.matched_belief_id}`,
        });
      }
    }
    return computeBrainTargets(nodesForBrain, linksForBrain);
  }, [beliefs, links, claims, showClaims]);

  useEffect(() => {
    const fg = fgRef.current;
    if (layout !== "force" || beliefs.length === 0) {
      fg?.d3Force("brainBias", null);
      return;
    }
    if (!fg) return;
    const f = createBrainBiasForce(brainAttractionTargets, () => zoomKRef.current);
    fg.d3Force("brainBias", f);
    fg.d3ReheatSimulation();
    return () => {
      fg.d3Force("brainBias", null);
    };
  }, [layout, brainAttractionTargets, beliefs.length]);

  useEffect(() => {
    graphDataRef.current = data;
  }, [data]);

  const adjacency = useMemo(() => buildAdjacency(data.links), [data.links]);

  const focusNeighborIds = useMemo(() => {
    if (!focusId) return null;
    return nHopNeighborSet(focusId, adjacency, focusDepth);
  }, [focusId, adjacency, focusDepth]);

  const searchMatches = useMemo(() => {
    if (!searchDebounced) return [] as GraphNode[];
    const scored: { n: GraphNode; s: number }[] = [];
    for (const n of data.nodes) {
      const texts =
        n.kind === "belief"
          ? [n.statement, n.topic, n.answer ?? ""]
          : [n.statement, n.topic];
      const s = bestFuzzyScore(texts, searchDebounced);
      if (s > 0) scored.push({ n, s });
    }
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, 12).map((x) => x.n);
  }, [data.nodes, searchDebounced]);

  const searchMatchSet = useMemo(() => {
    if (!searchDebounced) return null as Set<string> | null;
    const s = new Set<string>();
    for (const n of data.nodes) {
      const texts =
        n.kind === "belief"
          ? [n.statement, n.topic, n.answer ?? ""]
          : [n.statement, n.topic];
      if (bestFuzzyScore(texts, searchDebounced) > 0) s.add(n.id);
    }
    return s;
  }, [data.nodes, searchDebounced]);

  const nodeCount = data.nodes.length;

  const flushHover = useCallback(() => {
    hoverRaf.current = null;
    if (pendingHover.current !== undefined) {
      setHoverNode(pendingHover.current);
      pendingHover.current = undefined;
    }
    if (pendingLinkHover.current !== undefined) {
      setHoverLink(pendingLinkHover.current);
      pendingLinkHover.current = undefined;
    }
  }, []);

  const scheduleHoverNode = useCallback(
    (n: GraphNode | null) => {
      pendingHover.current = n;
      if (hoverRaf.current != null) return;
      hoverRaf.current = requestAnimationFrame(() => {
        flushHover();
      });
    },
    [flushHover],
  );

  const scheduleHoverLink = useCallback(
    (l: GraphLink | null) => {
      pendingLinkHover.current = l;
      if (hoverRaf.current != null) return;
      hoverRaf.current = requestAnimationFrame(() => {
        flushHover();
      });
    },
    [flushHover],
  );

  const refreshBboxAndSamples = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    try {
      const bb = fg.getGraphBbox();
      setBbox(bb);
      const maxPts = nodeCount > 200 ? 200 : 400;
      const pts: { x: number; y: number; c: string }[] = [];
      for (const n of graphDataRef.current.nodes) {
        if (typeof n.x !== "number" || typeof n.y !== "number") continue;
        if (pts.length >= maxPts) break;
        pts.push({ x: n.x, y: n.y, c: n.color });
      }
      setMinimapSamples(pts);
    } catch {
      /* ignore */
    }
  }, [nodeCount]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      fgRef.current?.d3ReheatSimulation?.();
    }, 0);
    return () => window.clearTimeout(t);
  }, [layout, data]);

  const bumpZoomTransform = useCallback((tr: ZoomTransform) => {
    setZoomT(tr);
    zoomKRef.current = tr.k;
  }, []);

  const handleZoom = useCallback(
    (tr: ZoomTransform) => {
      bumpZoomTransform(tr);
    },
    [bumpZoomTransform],
  );

  const handleZoomEnd = useCallback(
    (tr: ZoomTransform) => {
      bumpZoomTransform(tr);
      if (layout === "force" && tr.k < 0.44 && graphDataRef.current.nodes.length > 0) {
        window.setTimeout(() => {
          fgRef.current?.d3ReheatSimulation?.();
        }, 0);
      }
    },
    [bumpZoomTransform, layout],
  );

  const zoomIn = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const k = fg.zoom();
    fg.zoom(k * 1.15, 220);
  }, []);

  const zoomOut = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const k = fg.zoom();
    fg.zoom(k / 1.15, 220);
  }, []);

  const fitView = useCallback(() => {
    fgRef.current?.zoomToFit(700, 72);
  }, []);

  const resetView = useCallback(() => {
    fitView();
  }, [fitView]);

  const centerOnNode = useCallback((n: GraphNode) => {
    const fg = fgRef.current;
    if (!fg || typeof n.x !== "number" || typeof n.y !== "number") return;
    fg.centerAt(n.x, n.y, 500);
    const k = Math.min(3, Math.max(1.2, fg.zoom()));
    fg.zoom(k, 500);
  }, []);

  const jumpToNode = useCallback(
    (n: GraphNode) => {
      centerOnNode(n);
      setSelected(n);
      setSearchOpen(false);
    },
    [centerOnNode],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      const inField = tag === "input" || tag === "textarea" || t?.isContentEditable;

      if (e.key === "Escape") {
        setFocusId(null);
        if (!inField) setSelected(null);
        return;
      }
      if (inField && e.key !== "/") return;

      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      }
      if (e.key === "0" && !inField) {
        e.preventDefault();
        resetView();
      }
      if ((e.key === "f" || e.key === "F") && !inField) {
        e.preventDefault();
        fitView();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, fitView, resetView]);

  const onLayoutSelect = (v: LayoutPreset) => {
    if (v === "hierarchical" || v === "cluster_topic") {
      toast("Layout coming soon", {
        description: v === "hierarchical" ? "Hierarchical by layer is planned." : "Cluster by topic is planned.",
      });
      return;
    }
    setLayout(v);
  };

  const toggleLayer = (layer: FrameworkLayer) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  const handleNodeClick = useCallback((n: GraphNode) => {
    setSelected(n);
    setFocusId(n.id);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setFocusId(null);
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const showTemporal = versions.length > 0;

  return (
    <FrameworkLayout
      title="Belief Graph"
      back="/framework"
      contentClassName="max-w-none w-full min-w-0 flex min-h-0 flex-1 flex-col px-2 pb-2 pt-2 sm:px-3 sm:pb-3 sm:pt-3"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2 text-[11px]">
          {ALL_LAYERS.map((layer) => {
            const hidden = hiddenLayers.has(layer);
            return (
              <button
                key={layer}
                type="button"
                onClick={() => toggleLayer(layer)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border transition-opacity duration-200",
                  hidden
                    ? "opacity-40 border-dashed border-border line-through"
                    : "bg-muted border-transparent",
                )}
                aria-pressed={!hidden}
                aria-label={
                  hidden ? `Show ${LAYER_META[layer].title} layer` : `Hide ${LAYER_META[layer].title} layer`
                }
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: LAYER_META[layer].tone }}
                />
                {LAYER_META[layer].title}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow duration-200"
      >
        <div className="flex flex-col gap-2 border-b border-border bg-muted/30 p-2 sm:p-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[12rem] max-w-md">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchRef}
                value={searchRaw}
                onChange={(e) => {
                  setSearchRaw(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchMatches[0]) {
                    e.preventDefault();
                    jumpToNode(searchMatches[0]!);
                  }
                }}
                placeholder="Search beliefs (statement, topic, answer)…"
                className="pl-8 h-9 transition-opacity duration-200"
                aria-label="Search graph nodes"
                aria-autocomplete="list"
                aria-expanded={searchOpen && searchMatches.length > 0}
              />
              {searchOpen && searchDebounced && searchMatches.length > 0 ? (
                <ul
                  className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md text-sm"
                  role="listbox"
                >
                  {searchMatches.map((n) => (
                    <li key={n.id} role="option">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => jumpToNode(n)}
                      >
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground block">
                          {n.kind === "belief" ? n.topic : "Claim"}
                        </span>
                        <span className="line-clamp-2">{n.statement}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <ToggleGroup
              type="single"
              value={labelDensity}
              onValueChange={(v) => v && setLabelDensity(v as LabelDensity)}
              className="justify-start flex-wrap"
              aria-label="Label density"
            >
              <ToggleGroupItem value="compact" size="sm" className="text-xs">
                Compact
              </ToggleGroupItem>
              <ToggleGroupItem value="detailed" size="sm" className="text-xs">
                Detailed
              </ToggleGroupItem>
              <ToggleGroupItem value="none" size="sm" className="text-xs">
                Hide labels
              </ToggleGroupItem>
            </ToggleGroup>

            <Select value={layout} onValueChange={(v) => onLayoutSelect(v as LayoutPreset)}>
              <SelectTrigger className="w-[10.5rem] h-9" aria-label="Layout preset">
                <SelectValue placeholder="Layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="force">Force (default)</SelectItem>
                <SelectItem value="brain">Brain</SelectItem>
                <SelectItem value="radial">Radial</SelectItem>
                <SelectItem value="hierarchical">Hierarchical</SelectItem>
                <SelectItem value="cluster_topic">Cluster by topic</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0"
                aria-label="Zoom in"
                onClick={zoomIn}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0"
                aria-label="Zoom out"
                onClick={zoomOut}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0"
                aria-label="Fit graph to screen"
                onClick={fitView}
              >
                <Scan className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0"
                aria-label="Reset view"
                onClick={resetView}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <Button
              size="sm"
              variant={showClaims ? "default" : "outline"}
              onClick={() => setShowClaims((s) => !s)}
              className="h-9"
            >
              {showClaims ? "Hide claims" : "Show claims"}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label="Keyboard shortcuts">
                  <Keyboard className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-xs space-y-2" align="end">
                <p className="font-medium text-sm">Shortcuts</p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>
                    <kbd className="px-1 rounded bg-muted">/</kbd> focus search
                  </li>
                  <li>
                    <kbd className="px-1 rounded bg-muted">+</kbd> / <kbd className="px-1 rounded bg-muted">-</kbd> zoom
                  </li>
                  <li>
                    <kbd className="px-1 rounded bg-muted">0</kbd> reset zoom (fit)
                  </li>
                  <li>
                    <kbd className="px-1 rounded bg-muted">F</kbd> fit to screen
                  </li>
                  <li>
                    <kbd className="px-1 rounded bg-muted">Esc</kbd> exit focus / clear selection when not typing
                  </li>
                </ul>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 min-w-[10rem]">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Focus depth</Label>
              <Slider
                className="w-28"
                value={[focusDepth]}
                min={1}
                max={3}
                step={1}
                disabled={!focusId}
                onValueChange={(v) => setFocusDepth(v[0] ?? 2)}
                aria-label="Neighborhood depth for focus mode"
              />
              <span className="text-xs tabular-nums w-4">{focusDepth}</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="g-layer"
                checked={groupByLayer}
                onCheckedChange={setGroupByLayer}
                aria-label="Group by layer hull"
              />
              <Label htmlFor="g-layer" className="text-xs cursor-pointer">
                Group by layer
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="g-topic"
                checked={groupByTopic}
                onCheckedChange={setGroupByTopic}
                aria-label="Group by topic hull"
              />
              <Label htmlFor="g-topic" className="text-xs cursor-pointer">
                Group by topic
              </Label>
            </div>
          </div>

          {showTemporal ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">Timeline (belief versions)</Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {format(new Date(asOfMs), "MMM d, yyyy HH:mm")}
                </span>
              </div>
              <Slider
                value={[asOfMs]}
                min={timelineBounds.min}
                max={timelineBounds.max}
                step={86_400_000 / 24}
                onValueChange={(v) => setAsOfMs(v[0] ?? timelineBounds.max)}
                aria-label="Scrub belief version history"
              />
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No belief version history loaded yet — timeline appears when versions exist.
            </p>
          )}
        </div>

        <div
          ref={canvasHostRef}
          className="relative min-h-0 min-w-0 flex-1"
          onMouseMove={(e) => {
            const rect = canvasHostRef.current?.getBoundingClientRect();
            if (!rect) return;
            setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
        >
          {data.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              No beliefs yet. Run the interview to start building your graph.
            </div>
          ) : (
            <ForceGraph2D
              ref={fgRef}
              graphData={data}
              width={canvasSize.w}
              height={Math.max(canvasSize.h, 320)}
              backgroundColor="transparent"
              nodeRelSize={4}
              linkColor={(l) => {
                const link = l as GraphLink;
                const { sid, tid } = linkNodeIds(link);
                let a = 1;
                if (focusNeighborIds && focusId) {
                  a *= focusNeighborIds.has(sid) && focusNeighborIds.has(tid) ? 1 : 0.16;
                }
                if (searchMatchSet && searchDebounced) {
                  a *= searchMatchSet.has(sid) && searchMatchSet.has(tid) ? 1 : 0.14;
                }
                return withAlpha(link.color, a);
              }}
              linkWidth={(l) => {
                const link = l as GraphLink;
                const { sid, tid } = linkNodeIds(link);
                let w = 1;
                if (focusNeighborIds && focusId) {
                  w *= focusNeighborIds.has(sid) && focusNeighborIds.has(tid) ? 1 : 0.35;
                }
                if (searchMatchSet && searchDebounced) {
                  w *= searchMatchSet.has(sid) && searchMatchSet.has(tid) ? 1 : 0.35;
                }
                return Math.max(0.35, 1.15 * w);
              }}
              linkDirectionalParticles={0}
              cooldownTicks={nodeCount > 150 ? 72 : 120}
              d3VelocityDecay={nodeCount > 150 ? 0.38 : 0.22}
              d3AlphaDecay={nodeCount > 150 ? 0.055 : 0.022}
              warmupTicks={nodeCount > 150 ? 48 : 80}
              onEngineStop={refreshBboxAndSamples}
              onZoom={handleZoom}
              onZoomEnd={handleZoomEnd}
              enableNodeDrag
              minZoom={0.05}
              maxZoom={12}
              onNodeClick={(n) => handleNodeClick(n as GraphNode)}
              onBackgroundClick={handleBackgroundClick}
              onNodeHover={(n) => {
                scheduleHoverNode(n as GraphNode | null);
              }}
              onLinkHover={(l) => {
                scheduleHoverLink(l as GraphLink | null);
              }}
              onRenderFramePre={(ctx) => {
                const gd = graphDataRef.current;
                if (!groupByLayer && !groupByTopic) return;

                const byLayer = new Map<FrameworkLayer, { x: number; y: number }[]>();
                const byTopic = new Map<string, { x: number; y: number }[]>();

                for (const n of gd.nodes) {
                  if (typeof n.x !== "number" || typeof n.y !== "number") continue;
                  if (hiddenLayers.has(n.layer as FrameworkLayer)) continue;
                  if (n.kind === "belief" && n.layer) {
                    if (!byLayer.has(n.layer)) byLayer.set(n.layer, []);
                    byLayer.get(n.layer)!.push({ x: n.x, y: n.y });
                  }
                  if (n.kind === "belief" && n.topic) {
                    if (!byTopic.has(n.topic)) byTopic.set(n.topic, []);
                    byTopic.get(n.topic)!.push({ x: n.x, y: n.y });
                  }
                }

                const drawHull = (pts: { x: number; y: number }[], fill: string) => {
                  if (pts.length < 3) return;
                  const hull = convexHull2D(pts);
                  if (hull.length < 3) return;
                  ctx.beginPath();
                  ctx.moveTo(hull[0]!.x, hull[0]!.y);
                  for (let i = 1; i < hull.length; i++) ctx.lineTo(hull[i]!.x, hull[i]!.y);
                  ctx.closePath();
                  ctx.fillStyle = fill;
                  ctx.fill();
                };

                if (groupByLayer) {
                  for (const layer of ALL_LAYERS) {
                    const pts = byLayer.get(layer);
                    if (!pts || pts.length < 3) continue;
                    drawHull(pts, hexToRgba(LAYER_META[layer].tone, 0.1));
                  }
                }
                if (groupByTopic) {
                  const palette = ["#94a3b8", "#64748b", "#78716c", "#71717a"];
                  let i = 0;
                  for (const [, pts] of byTopic) {
                    if (pts.length < 3) continue;
                    const c = palette[i % palette.length]!;
                    drawHull(pts, hexToRgba(c, 0.08));
                    i++;
                  }
                }
              }}
              nodePointerAreaPaint={(node, color, ctx, globalScale) => {
                const n = node as GraphNode & { x: number; y: number };
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.val + 4 / globalScale, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
              }}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const n = node as GraphNode & { x: number; y: number; __future?: boolean };
                const r = n.val;

                let alpha = 1;
                if (n.kind === "belief" && n.layer && hiddenLayers.has(n.layer)) alpha = 0.06;
                if (n.__future) alpha *= 0.25;
                if (focusNeighborIds && focusId) {
                  alpha *= focusNeighborIds.has(n.id) ? 1 : 0.14;
                }
                if (searchMatchSet && searchDebounced) {
                  alpha *= searchMatchSet.has(n.id) ? 1 : 0.18;
                }

                ctx.beginPath();
                ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
                ctx.fillStyle = n.color;
                ctx.globalAlpha = n.kind === "claim" ? 0.72 * alpha : alpha;
                ctx.fill();
                ctx.globalAlpha = 1;

                if (labelDensity === "none") return;
                const showDetailed = labelDensity === "detailed";
                const minScale = showDetailed ? 0.35 : 0.85;
                if (globalScale < minScale && n.kind === "claim") return;

                const fontSize = showDetailed
                  ? Math.max(11 / globalScale, 3.5)
                  : Math.max(10 / globalScale, 3);
                ctx.font = `${fontSize}px ui-sans-serif, system-ui`;
                ctx.fillStyle = "hsl(var(--foreground))";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.globalAlpha = alpha;
                const raw =
                  showDetailed && n.kind === "belief"
                    ? `${n.topic}: ${n.statement}`
                    : n.label;
                const maxLen = showDetailed ? 120 : 40;
                const label = raw.length > maxLen ? raw.slice(0, maxLen - 1) + "…" : raw;
                ctx.fillText(label, n.x, n.y + r + 1);
                ctx.globalAlpha = 1;
              }}
            />
          )}

          <div className="absolute bottom-3 right-3 z-10 pointer-events-auto">
            <BeliefGraphMinimap
              width={168}
              height={112}
              bbox={bbox}
              transform={zoomT}
              graphWidth={canvasSize.w}
              graphHeight={Math.max(canvasSize.h, 320)}
              samples={minimapSamples}
              onNavigate={(gx, gy) => {
                fgRef.current?.centerAt(gx, gy, 400);
              }}
            />
          </div>

          {(hoverNode || hoverLink) && (
            <div
              className="absolute z-30 pointer-events-none max-w-xs rounded-lg border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-lg text-xs transition-opacity duration-150"
              style={{
                left: Math.min(pointer.x + 12, canvasSize.w - 280),
                top: Math.min(pointer.y + 12, canvasSize.h - 160),
              }}
            >
              {hoverNode ? (
                <>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {hoverNode.kind === "belief" ? hoverNode.topic : "Artifact claim"}
                  </div>
                  <div className="text-sm leading-snug mt-1">{hoverNode.statement}</div>
                  {hoverNode.kind === "belief" ? (
                    <div className="mt-2 space-y-0.5 text-muted-foreground">
                      <div>Confidence: {hoverNode.confidence ?? "—"}%</div>
                      {hoverNode.updatedAt ? (
                        <div>Updated: {format(new Date(hoverNode.updatedAt), "MMM d, yyyy")}</div>
                      ) : null}
                      {hoverNode.answer ? (
                        <div className="line-clamp-4 mt-1">Answer: {hoverNode.answer}</div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : hoverLink ? (
                <>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Relation</div>
                  <div className="text-sm mt-1">{hoverLink.relation}</div>
                  {hoverLink.reason ? (
                    <div className="mt-2 text-muted-foreground line-clamp-6">{hoverLink.reason}</div>
                  ) : (
                    <div className="mt-2 text-muted-foreground italic">No reason note stored.</div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {selected && (
            <div className="absolute top-3 right-3 max-w-[18rem] rounded-lg border border-border bg-background/95 backdrop-blur p-3 shadow-lg transition-opacity duration-200 z-20">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                {selected.kind === "belief"
                  ? selected.layer
                    ? LAYER_META[selected.layer].title
                    : "Belief"
                  : "Artifact claim"}
              </div>
              <div className="text-sm leading-snug mb-3">{selected.label}</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  onClick={() => centerOnNode(selected)}
                  aria-label="Center view on this node"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  Center
                </Button>
                {selected.kind === "belief" && selected.beliefId && (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/framework/beliefs/${selected.beliefId}`)}
                  >
                    Open belief
                  </Button>
                )}
                {selected.kind === "claim" && selected.artifactId && (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/framework/artifacts/${selected.artifactId}`)}
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
      </div>

      <p className="shrink-0 text-xs text-muted-foreground">
        Node size = confidence. Edge color: green = supports/agree, red = contradicts/disagree, gold = new claim,
        gray = related.
      </p>
      </div>
    </FrameworkLayout>
  );
}
