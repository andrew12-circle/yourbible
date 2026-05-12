import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type { JourneyCluster, JourneyEvent } from "./faithJourneyTypes";
import { paddedTimeRangeFromClusters } from "./faithJourneyBuild";

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = MS_DAY * 7;
const PAD_X = 56;
const PAD_Y = 48;
const NODE_R = 20;
const BRANCH_CONTROL = 52;
const MIN_TICK_LABEL_GAP_PX = 48;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function formatEventDate(ms: number): string {
  return dateFmt.format(new Date(ms));
}

function monthStartsBetween(minMs: number, maxMs: number): Date[] {
  const out: Date[] = [];
  const d = new Date(minMs);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  const end = new Date(maxMs);
  while (d.getTime() <= end.getTime() + MS_DAY * 32) {
    out.push(new Date(d));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

/** Monday 00:00 UTC on or before `minMs`, then weekly through range. */
function weekStartsUtc(minMs: number, maxMs: number): Date[] {
  const out: Date[] = [];
  const d = new Date(minMs);
  d.setUTCHours(0, 0, 0, 0);
  const dow = d.getUTCDay();
  const toMonday = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - toMonday);
  while (d.getTime() + MS_WEEK < minMs) {
    d.setUTCDate(d.getUTCDate() + 7);
  }
  const end = maxMs + MS_WEEK;
  while (d.getTime() <= end) {
    out.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

type AxisKind = "month" | "week";

type AxisCandidate = { t: number; kind: AxisKind };

function buildAxisCandidates(tMin: number, tMax: number, pxPerMs: number): AxisCandidate[] {
  const pxPerWeek = pxPerMs * MS_WEEK;
  const months = monthStartsBetween(tMin, tMax).map((dt) => ({ t: dt.getTime(), kind: "month" as const }));
  const weeks =
    pxPerWeek >= 38 ? weekStartsUtc(tMin, tMax).map((dt) => ({ t: dt.getTime(), kind: "week" as const })) : [];

  const all = [...months, ...weeks].sort((a, b) => a.t - b.t);
  const dedup: AxisCandidate[] = [];
  const CLOSE = MS_DAY * 0.85;
  for (const c of all) {
    const prev = dedup[dedup.length - 1];
    if (prev && Math.abs(c.t - prev.t) < CLOSE) {
      if (c.kind === "month") dedup[dedup.length - 1] = c;
      continue;
    }
    dedup.push(c);
  }
  return dedup;
}

type LabeledAxisTick = { t: number; label: string; kind: AxisKind };

function pickLabeledAxisTicks(
  candidates: AxisCandidate[],
  mapT: (t: number) => number,
  minPos: number,
  maxPos: number,
): LabeledAxisTick[] {
  let lastPos = -1e9;
  let lastYearShown: number | null = null;
  const out: LabeledAxisTick[] = [];
  for (const c of candidates) {
    const pos = mapT(c.t);
    if (pos < minPos || pos > maxPos) continue;
    if (pos - lastPos < MIN_TICK_LABEL_GAP_PX) continue;
    const d = new Date(c.t);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    let label: string;
    if (c.kind === "week") {
      label = `${d.getUTCDate()} ${MONTH_SHORT[m]}`;
      if (lastYearShown !== y) label = `${label} ${y}`;
    } else if (lastYearShown !== y) {
      label = `${MONTH_SHORT[m]} ${y}`;
    } else {
      label = MONTH_SHORT[m]!;
    }
    out.push({ t: c.t, label, kind: c.kind });
    lastPos = pos;
    lastYearShown = y;
  }
  return out;
}

function rgbaFromHex(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length !== 7) return hex;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `rgba(${r},${g},${b},${alpha})`;
}

interface Props {
  clusters: JourneyCluster[];
  vertical: boolean;
  zoomFactor: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  expandedClusterIds: ReadonlySet<string>;
  onToggleCluster: (id: string) => void;
}

export default function FaithJourneyTimeline({
  clusters,
  vertical,
  zoomFactor,
  onZoomIn,
  onZoomOut,
  expandedClusterIds,
  onToggleCluster,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 320, h: 400 });

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewport({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const { min: tMin, max: tMax } = useMemo(() => paddedTimeRangeFromClusters(clusters), [clusters]);
  const span = Math.max(tMax - tMin, 1);

  const layout = useMemo(() => {
    if (vertical) {
      const innerH = Math.max(viewport.h * 1.2, 480);
      const basePxPerMs = (innerH - PAD_Y * 2) / span;
      const pxPerMs = basePxPerMs * zoomFactor;
      const totalH = PAD_Y * 2 + span * pxPerMs;
      const midX = Math.max(viewport.w / 2, 160);
      const spineX = midX;
      return { mode: "vertical" as const, pxPerMs, totalH, totalW: viewport.w, spineX, tMin, tMax, span };
    }
    const innerW = Math.max(viewport.w - 24, 560);
    const basePxPerMs = (innerW - PAD_X * 2) / span;
    const pxPerMs = basePxPerMs * zoomFactor;
    const totalW = PAD_X * 2 + span * pxPerMs;
    const spineY = 132;
    return { mode: "horizontal" as const, pxPerMs, totalW, totalH: 288, spineY, tMin, tMax, span };
  }, [vertical, viewport.w, viewport.h, span, tMin, tMax, zoomFactor]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || vertical || clusters.length === 0 || layout.mode !== "horizontal") return;
    el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
  }, [vertical, clusters, layout.totalW, layout.mode]);

  const timeToX = useCallback(
    (t: number) => {
      if (layout.mode !== "horizontal") return 0;
      return PAD_X + (t - layout.tMin) * layout.pxPerMs;
    },
    [layout],
  );

  const timeToY = useCallback(
    (t: number) => {
      if (layout.mode !== "vertical") return 0;
      return PAD_Y + (t - layout.tMin) * layout.pxPerMs;
    },
    [layout],
  );

  const axisLabeledTicks = useMemo(() => {
    if (layout.mode === "horizontal") {
      const { pxPerMs, tMin: rangeMin, totalW } = layout;
      const candidates = buildAxisCandidates(rangeMin, tMax, pxPerMs);
      return pickLabeledAxisTicks(
        candidates,
        (t) => PAD_X + (t - rangeMin) * pxPerMs,
        PAD_X - 14,
        totalW - PAD_X + 14,
      );
    }
    if (layout.mode === "vertical") {
      const { pxPerMs, tMin: rangeMin, totalH } = layout;
      const candidates = buildAxisCandidates(rangeMin, tMax, pxPerMs);
      return pickLabeledAxisTicks(
        candidates,
        (t) => PAD_Y + (t - rangeMin) * pxPerMs,
        PAD_Y - 14,
        totalH - PAD_Y + 14,
      );
    }
    return [];
  }, [layout, tMin, tMax]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1">
        <span className="text-[11px] text-muted-foreground mr-2 tabular-nums">Zoom</span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-full border-border/60 shadow-sm"
          onClick={onZoomOut}
          aria-label="Zoom out timeline"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-full border-border/60 shadow-sm"
          onClick={onZoomIn}
          aria-label="Zoom in timeline"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "relative w-full rounded-2xl border border-border/50 bg-gradient-to-b from-muted/20 to-background shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03]",
          vertical ? "max-h-[min(70vh,560px)] overflow-y-auto overflow-x-hidden" : "overflow-x-auto overflow-y-hidden",
        )}
      >
        <div
          className="relative touch-pan-y"
          style={{
            width: layout.mode === "horizontal" ? layout.totalW : "100%",
            height: layout.totalH,
            minHeight: layout.mode === "vertical" ? layout.totalH : undefined,
            minWidth: layout.mode === "horizontal" ? layout.totalW : undefined,
          }}
        >
          <svg
            className="absolute inset-0 text-border/55"
            width="100%"
            height="100%"
            viewBox={`0 0 ${layout.mode === "horizontal" ? layout.totalW : layout.totalW} ${layout.totalH}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            {layout.mode === "horizontal" ? (
              <HorizontalSpineAndTicks spineY={layout.spineY} totalW={layout.totalW} ticks={axisLabeledTicks} timeToX={timeToX} />
            ) : (
              <VerticalSpineAndTicks spineX={layout.spineX} totalH={layout.totalH} ticks={axisLabeledTicks} timeToY={timeToY} />
            )}
          </svg>

          {clusters.map((cluster, idx) => {
            const expanded = expandedClusterIds.has(cluster.id);
            const side = idx % 2 === 0 ? "a" : "b";
            if (layout.mode === "horizontal") {
              const cx = timeToX(cluster.anchorMs);
              const nx = cx;
              const ny = side === "a" ? layout.spineY - BRANCH_CONTROL - NODE_R : layout.spineY + BRANCH_CONTROL + NODE_R;
              const pathD = sproutPathHorizontal(cx, layout.spineY, nx, ny);
              const stroke = rgbaFromHex(cluster.events[0]!.color, 0.42);
              return (
                <div key={cluster.id}>
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${layout.totalW} ${layout.totalH}`}
                    preserveAspectRatio="none"
                  >
                    <path d={pathD} fill="none" stroke={stroke} strokeWidth={1.35} vectorEffect="non-scaling-stroke" />
                  </svg>
                  <ClusterNode
                    cluster={cluster}
                    style={{ left: nx, top: ny, transform: "translate(-50%, -50%)" }}
                    expanded={expanded}
                    onToggle={() => onToggleCluster(cluster.id)}
                  />
                  {expanded && cluster.events.length > 1 && (
                    <ExpandedStack
                      events={cluster.events}
                      style={{
                        left: nx,
                        top: ny + NODE_R + 28,
                        transform: "translateX(-50%)",
                      }}
                    />
                  )}
                </div>
              );
            }
            const cy = timeToY(cluster.anchorMs);
            const nx = side === "a" ? layout.spineX - BRANCH_CONTROL - NODE_R - 8 : layout.spineX + BRANCH_CONTROL + NODE_R + 8;
            const ny = cy;
            const pathD = sproutPathVertical(layout.spineX, cy, nx, ny);
            const stroke = rgbaFromHex(cluster.events[0]!.color, 0.42);
            return (
              <div key={cluster.id}>
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${layout.totalW} ${layout.totalH}`}
                  preserveAspectRatio="none"
                >
                  <path d={pathD} fill="none" stroke={stroke} strokeWidth={1.35} vectorEffect="non-scaling-stroke" />
                </svg>
                <ClusterNode
                  cluster={cluster}
                  style={{ left: nx, top: ny, transform: "translate(-50%, -50%)" }}
                  expanded={expanded}
                  onToggle={() => onToggleCluster(cluster.id)}
                />
                {expanded && cluster.events.length > 1 && (
                  <ExpandedStack
                    events={cluster.events}
                    style={{
                      left: nx,
                      top: ny + NODE_R + 24,
                      transform: "translateX(-50%)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function sproutPathHorizontal(sx: number, sy: number, ex: number, ey: number): string {
  const midY = (sy + ey) / 2;
  return `M ${sx} ${sy} C ${sx} ${midY} ${ex} ${midY} ${ex} ${ey}`;
}

function sproutPathVertical(sx: number, sy: number, ex: number, ey: number): string {
  const midX = (sx + ex) / 2;
  return `M ${sx} ${sy} C ${midX} ${sy} ${midX} ${ey} ${ex} ${ey}`;
}

function HorizontalSpineAndTicks({
  spineY,
  totalW,
  ticks,
  timeToX,
}: {
  spineY: number;
  totalW: number;
  ticks: LabeledAxisTick[];
  timeToX: (t: number) => number;
}) {
  const d = `M ${PAD_X} ${spineY} Q ${totalW / 2} ${spineY + 6} ${totalW - PAD_X} ${spineY}`;
  return (
    <>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-border/70" />
      {ticks.map((tk) => {
        const x = timeToX(tk.t);
        const isMonth = tk.kind === "month";
        const h = isMonth ? 12 : 7;
        const fs = isMonth ? 11 : 10;
        return (
          <g key={`${tk.t}-${tk.kind}`}>
            <line x1={x} x2={x} y1={spineY} y2={spineY + h} stroke="currentColor" strokeWidth={isMonth ? 1.35 : 1} />
            <text
              x={x}
              y={spineY + 26}
              textAnchor="middle"
              className="fill-foreground/80 font-medium"
              style={{ fontFamily: "ui-sans-serif, system-ui", fontSize: fs }}
              transform={`rotate(-10 ${x} ${spineY + 26})`}
            >
              {tk.label}
            </text>
          </g>
        );
      })}
    </>
  );
}

function VerticalSpineAndTicks({
  spineX,
  totalH,
  ticks,
  timeToY,
}: {
  spineX: number;
  totalH: number;
  ticks: LabeledAxisTick[];
  timeToY: (t: number) => number;
}) {
  const d = `M ${spineX} ${PAD_Y} Q ${spineX + 5} ${totalH / 2} ${spineX} ${totalH - PAD_Y}`;
  return (
    <>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-border/70" />
      {ticks.map((tk, i) => {
        const y = timeToY(tk.t);
        const isMonth = tk.kind === "month";
        const w = isMonth ? 12 : 7;
        const fs = isMonth ? 11 : 10;
        const stagger = i % 2 === 1 ? 10 : 0;
        return (
          <g key={`${tk.t}-${tk.kind}`}>
            <line x1={spineX - w} x2={spineX} y1={y} y2={y} stroke="currentColor" strokeWidth={isMonth ? 1.35 : 1} />
            <text
              x={spineX - w - 6}
              y={y + 3 + stagger}
              textAnchor="end"
              className="fill-foreground/80 font-medium"
              style={{ fontFamily: "ui-sans-serif, system-ui", fontSize: fs }}
            >
              {tk.label}
            </text>
          </g>
        );
      })}
    </>
  );
}

function ClusterNode({
  cluster,
  style,
  expanded,
  onToggle,
}: {
  cluster: JourneyCluster;
  style: CSSProperties;
  expanded: boolean;
  onToggle: () => void;
}) {
  const primary = cluster.events[0]!;
  const Icon = primary.icon;
  const multi = cluster.events.length > 1;
  const label = multi && !expanded ? `${cluster.events.length} moments` : truncateLabel(primary.title, 22);
  const ring = rgbaFromHex(primary.color, 0.38);
  const ariaMoment =
    primary.kind === "journal"
      ? primary.journalVariant === "ai_chat"
        ? "AI chat journal"
        : "Journal"
      : null;

  return (
    <div className="absolute z-10 flex flex-col items-center gap-1" style={style}>
      <HoverCard openDelay={80} closeDelay={120}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className={cn(
              "group relative flex h-[42px] w-[42px] items-center justify-center rounded-full border-2 bg-background/95 shadow-[0_4px_20px_rgba(0,0,0,0.08)] outline-none backdrop-blur-[1px] transition-transform duration-200 ease-out",
              "hover:scale-[1.08] hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
            style={{ color: primary.color, borderColor: ring, boxShadow: `0 0 0 1px ${rgbaFromHex(primary.color, 0.12)} inset` }}
            onClick={(e) => {
              if (!multi) return;
              e.preventDefault();
              onToggle();
            }}
            aria-expanded={multi ? expanded : undefined}
            aria-label={
              multi ? `${cluster.events.length} moments on the timeline` : `${primary.title}${ariaMoment ? `, ${ariaMoment}` : ""}`
            }
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            {multi && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background shadow-sm">
                {cluster.events.length}
              </span>
            )}
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-72 border-border/60 p-4 shadow-lg" side="top" align="center">
          <div className="space-y-3">
            {cluster.events.map((ev) => (
              <div key={ev.id} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
                <div className="flex gap-2">
                  <span className="mt-1 h-8 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: ev.color }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-snug text-foreground">{ev.title}</div>
                    {ev.subtitle && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{ev.subtitle}</div>}
                    <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">{formatEventDate(ev.timestamp)}</div>
                    <Link
                      to={ev.link}
                      className="mt-2 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </HoverCardContent>
      </HoverCard>
      <span className="max-w-[7rem] text-center text-[10px] font-medium leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

function ExpandedStack({ events, style }: { events: JourneyEvent[]; style: CSSProperties }) {
  return (
    <div
      className="absolute z-20 min-w-[200px] max-w-[240px] rounded-xl border border-border/50 bg-background/95 p-2 shadow-lg backdrop-blur-sm"
      style={style}
    >
      <ul className="space-y-1">
        {events.map((ev) => (
          <li key={ev.id}>
            <Link
              to={ev.link}
              className="flex gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-foreground transition-colors hover:bg-muted/60"
            >
              <span className="mt-0.5 h-6 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: ev.color }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 font-medium">{ev.title}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground tabular-nums">{formatEventDate(ev.timestamp)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function truncateLabel(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}
