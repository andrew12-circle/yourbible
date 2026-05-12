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
const PAD_X = 56;
const PAD_Y = 48;
const NODE_R = 20;
const BRANCH_CONTROL = 52;

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
    return { mode: "horizontal" as const, pxPerMs, totalW, totalH: 268, spineY, tMin, tMax, span };
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

  const ticks = useMemo(() => {
    const months = monthStartsBetween(tMin, tMax);
    return months
      .map((d) => ({ t: d.getTime(), y: d.getUTCFullYear(), m: d.getUTCMonth() }))
      .filter((x) => x.t >= tMin && x.t <= tMax);
  }, [tMin, tMax]);

  const pxPerMonth = layout.pxPerMs * (MS_DAY * 30.4);
  const showMonthTicks = pxPerMonth >= 28;

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
              <HorizontalSpineAndTicks
                spineY={layout.spineY}
                totalW={layout.totalW}
                ticks={ticks}
                timeToX={timeToX}
                showMonthTicks={showMonthTicks}
              />
            ) : (
              <VerticalSpineAndTicks
                spineX={layout.spineX}
                totalH={layout.totalH}
                ticks={ticks}
                timeToY={timeToY}
                showMonthTicks={showMonthTicks}
              />
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
              return (
                <div key={cluster.id}>
                  <svg
                    className="absolute inset-0 pointer-events-none text-muted-foreground/35"
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${layout.totalW} ${layout.totalH}`}
                    preserveAspectRatio="none"
                  >
                    <path d={pathD} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
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
            return (
              <div key={cluster.id}>
                <svg
                  className="absolute inset-0 pointer-events-none text-muted-foreground/35"
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${layout.totalW} ${layout.totalH}`}
                  preserveAspectRatio="none"
                >
                  <path d={pathD} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
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
  showMonthTicks,
}: {
  spineY: number;
  totalW: number;
  ticks: { t: number; y: number; m: number }[];
  timeToX: (t: number) => number;
  showMonthTicks: boolean;
}) {
  const d = `M ${PAD_X} ${spineY} Q ${totalW / 2} ${spineY + 6} ${totalW - PAD_X} ${spineY}`;
  return (
    <>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-border/70" />
      {ticks.map((tk) => {
        const x = timeToX(tk.t);
        if (!showMonthTicks && tk.m !== 0) return null;
        const isYear = tk.m === 0;
        const h = isYear ? 14 : 8;
        return (
          <g key={`${tk.t}`}>
            <line x1={x} x2={x} y1={spineY} y2={spineY + h} stroke="currentColor" strokeWidth={isYear ? 1.5 : 1} />
            {isYear && (
              <text
                x={x}
                y={spineY + 28}
                textAnchor="middle"
                className="fill-foreground/85 text-[11px] font-semibold"
                style={{ fontFamily: "ui-sans-serif, system-ui" }}
              >
                {tk.y}
              </text>
            )}
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
  showMonthTicks,
}: {
  spineX: number;
  totalH: number;
  ticks: { t: number; y: number; m: number }[];
  timeToY: (t: number) => number;
  showMonthTicks: boolean;
}) {
  const d = `M ${spineX} ${PAD_Y} Q ${spineX + 5} ${totalH / 2} ${spineX} ${totalH - PAD_Y}`;
  return (
    <>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-border/70" />
      {ticks.map((tk) => {
        const y = timeToY(tk.t);
        if (!showMonthTicks && tk.m !== 0) return null;
        const isYear = tk.m === 0;
        const w = isYear ? 14 : 8;
        return (
          <g key={`${tk.t}`}>
            <line x1={spineX - w} x2={spineX} y1={y} y2={y} stroke="currentColor" strokeWidth={isYear ? 1.5 : 1} />
            {isYear && (
              <text
                x={spineX - 22}
                y={y + 4}
                textAnchor="end"
                className="fill-foreground/85 text-[11px] font-semibold"
                style={{ fontFamily: "ui-sans-serif, system-ui" }}
              >
                {tk.y}
              </text>
            )}
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

  return (
    <div className="absolute z-10 flex flex-col items-center gap-1" style={style}>
      <HoverCard openDelay={80} closeDelay={120}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className={cn(
              "group relative flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/60 bg-background shadow-[0_4px_20px_rgba(0,0,0,0.08)] outline-none transition-transform duration-200 ease-out",
              "hover:scale-[1.08] hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
            style={{ color: primary.color }}
            onClick={(e) => {
              if (!multi) return;
              e.preventDefault();
              onToggle();
            }}
            aria-expanded={multi ? expanded : undefined}
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
              className="block rounded-lg px-2 py-1.5 text-left text-[11px] text-foreground transition-colors hover:bg-muted/60"
            >
              <span className="line-clamp-2 font-medium">{ev.title}</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground tabular-nums">{formatEventDate(ev.timestamp)}</span>
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
