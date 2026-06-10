import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { Loader2, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalShell from "@/components/journal/JournalShell";
import { graphNodeValFromDegree } from "@/lib/journal/wikilinks";
import { entryDisplayTitle } from "@/lib/journal/entryDisplay";

interface EntryRow {
  id: string;
  title: string | null;
  body: string;
  summary: string | null;
  entry_at_ts: string;
}

interface LinkRow {
  entry_id: string;
  target_ref: { entry_id?: string };
}

type GraphNode = {
  id: string;
  label: string;
  val: number;
  color: string;
};

type GraphLink = {
  source: string;
  target: string;
};

const NODE_COLOR = "hsl(270 55% 58%)";
const LINK_COLOR = "hsla(270 30% 50% / 0.35)";

export default function JournalGraphPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { journalId: paramJournalId } = useParams<{ journalId?: string }>();
  const journalId = paramJournalId ?? null;

  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 520 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    (async () => {
      let entryQ = supabase
        .from("journal_entries")
        .select("id,title,body,summary,entry_at_ts")
        .eq("user_id", user.id)
        .or("entry_kind.is.null,entry_kind.neq.vent")
        .order("entry_at_ts", { ascending: false })
        .limit(500);
      if (journalId) entryQ = entryQ.eq("journal_id", journalId);

      const [{ data: entryData }, { data: linkData }] = await Promise.all([
        entryQ,
        supabase
          .from("journal_entry_links")
          .select("entry_id,target_ref")
          .eq("user_id", user.id)
          .eq("target_kind", "entry"),
      ]);
      setEntries((entryData as EntryRow[]) ?? []);
      setLinks(
        ((linkData ?? []) as LinkRow[]).filter((l) => l.target_ref?.entry_id),
      );
      setBusy(false);
    })();
  }, [user, journalId]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const sync = () => setCanvasSize({ w: el.clientWidth, h: Math.max(el.clientHeight, 400) });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const idSet = new Set(entries.map((e) => e.id));
    const degree = new Map<string, number>();
    const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);

    const linkRows: GraphLink[] = [];
    for (const l of links) {
      const target = l.target_ref.entry_id!;
      if (!idSet.has(l.entry_id) || !idSet.has(target) || l.entry_id === target) continue;
      linkRows.push({ source: l.entry_id, target });
      bump(l.entry_id);
      bump(target);
    }

    const nodes: GraphNode[] = entries.map((e) => {
      const deg = degree.get(e.id) ?? 0;
      const title = entryDisplayTitle(e);
      const label =
        title ||
        new Date(e.entry_at_ts).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      return {
        id: e.id,
        label,
        val: graphNodeValFromDegree(deg),
        color: deg > 0 ? NODE_COLOR : "hsl(270 25% 72%)",
      };
    });

    return { nodes, links: linkRows };
  }, [entries, links]);

  const handleNodeClick = useCallback(
    (node: object) => {
      const id = (node as GraphNode).id;
      navigate(`/journal/${id}`);
    },
    [navigate],
  );

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const linkedCount = graphData.links.length;
  const connectedNodes = graphData.nodes.filter((n) => n.val > graphNodeValFromDegree(0)).length;

  return (
    <JournalShell
      journalId={journalId}
      activeTab="graph"
      totalCount={entries.length}
      subtitle={
        linkedCount > 0
          ? `${connectedNodes} connected · ${linkedCount} links`
          : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
      }
    >
      <div className="px-3 pb-4">
        {busy ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 px-6">
            <Network className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-lg font-semibold tracking-tight">No entries yet</p>
            <p className="text-[15px] text-muted-foreground mt-1 max-w-sm mx-auto">
              Write journal entries and link them with{" "}
              <code className="text-[13px] bg-muted px-1 rounded">[[another entry]]</code> to grow your map.
            </p>
          </div>
        ) : (
          <>
            {linkedCount === 0 && (
              <p className="text-[13px] text-muted-foreground mb-3 px-1 leading-relaxed">
                Link entries in your writing with{" "}
                <code className="bg-muted px-1 rounded text-[12px]">[[entry title]]</code> or{" "}
                <code className="bg-muted px-1 rounded text-[12px]">[[entry:uuid]]</code> — connections appear here automatically.
              </p>
            )}
            <div
              ref={hostRef}
              className="relative overflow-hidden rounded-2xl border border-border bg-card"
              style={{ height: "min(70vh, 560px)" }}
            >
              <ForceGraph2D
                ref={fgRef}
                width={canvasSize.w}
                height={canvasSize.h}
                graphData={graphData}
                nodeId="id"
                nodeVal="val"
                nodeColor="color"
                linkColor={() => LINK_COLOR}
                linkWidth={1}
                cooldownTicks={80}
                onNodeClick={handleNodeClick}
                onNodeHover={(n) => setHoverId(n ? (n as GraphNode).id : null)}
                nodePointerAreaPaint={(node, color, ctx, globalScale) => {
                  const n = node as GraphNode & { x: number; y: number };
                  ctx.beginPath();
                  ctx.arc(n.x, n.y, n.val + 3 / globalScale, 0, 2 * Math.PI);
                  ctx.fillStyle = color;
                  ctx.fill();
                }}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const n = node as GraphNode & { x: number; y: number };
                  const r = n.val;
                  const active = hoverId === n.id;
                  ctx.beginPath();
                  ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
                  ctx.fillStyle = n.color;
                  ctx.globalAlpha = active ? 1 : 0.88;
                  ctx.fill();
                  ctx.globalAlpha = 1;
                  if (globalScale < 0.6 && !active) return;
                  const fontSize = Math.max(9 / globalScale, 3);
                  ctx.font = `${fontSize}px ui-sans-serif, system-ui`;
                  ctx.fillStyle = "hsl(var(--foreground))";
                  ctx.textAlign = "center";
                  ctx.textBaseline = "top";
                  const label = n.label.length > 36 ? `${n.label.slice(0, 35)}…` : n.label;
                  ctx.fillText(label, n.x, n.y + r + 2);
                }}
              />
            </div>
            {hoverId && (
              <p className="text-[12px] text-muted-foreground mt-2 px-1">
                Click a node to open the entry. Larger dots have more connections.
              </p>
            )}
          </>
        )}
        <p className="text-[11px] text-muted-foreground mt-4 px-1">
          Tip: mention another entry as{" "}
          <Link to="/journal/new" className="underline underline-offset-2">
            [[its title]]
          </Link>{" "}
          while writing — backlinks work both ways.
        </p>
      </div>
    </JournalShell>
  );
}
