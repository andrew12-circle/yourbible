import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronDown, ChevronRight, ChevronsDownUp, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_LAYERS, LAYER_META, type FrameworkLayer } from "@/data/framework";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import QuickBeliefDialog from "@/components/framework/QuickBeliefDialog";
import { cn } from "@/lib/utils";

const LS_LAYER_OPEN = "yb_beliefs_layer_open_v1";
const LS_TOPIC_OPEN = "yb_beliefs_topic_open_v1";

interface BeliefRow {
  id: string;
  layer: string;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
  updated_at: string;
}

type SortKey = "recent" | "confidence-desc" | "confidence-asc" | "az";

function loadOpenMap(key: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function persistOpenMap(key: string, map: Record<string, boolean>) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

function topicStorageKey(layer: FrameworkLayer, topic: string) {
  return `${layer}\t${topic}`;
}

function isOpen(map: Record<string, boolean>, key: string) {
  return map[key] !== false;
}

function confidencePillClass(c: number) {
  if (c < 40) return "bg-red-500/15 text-red-700 dark:text-red-400";
  if (c < 70) return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
  return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
}

export default function BeliefsListPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<BeliefRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [layerOpen, setLayerOpen] = useState<Record<string, boolean>>(() => loadOpenMap(LS_LAYER_OPEN));
  const [topicOpen, setTopicOpen] = useState<Record<string, boolean>>(() => loadOpenMap(LS_TOPIC_OPEN));
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("belief_nodes")
      .select("id,layer,topic,statement,answer,confidence,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setRows((data as BeliefRow[]) ?? []);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    persistOpenMap(LS_LAYER_OPEN, layerOpen);
  }, [layerOpen]);

  useEffect(() => {
    persistOpenMap(LS_TOPIC_OPEN, topicOpen);
  }, [topicOpen]);

  const filteredSorted = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.topic.toLowerCase().includes(q) ||
          r.statement.toLowerCase().includes(q) ||
          (r.answer && r.answer.toLowerCase().includes(q)),
      );
    }
    switch (sort) {
      case "confidence-desc":
        list.sort((a, b) => b.confidence - a.confidence || b.updated_at.localeCompare(a.updated_at));
        break;
      case "confidence-asc":
        list.sort((a, b) => a.confidence - b.confidence || b.updated_at.localeCompare(a.updated_at));
        break;
      case "az":
        list.sort((a, b) => a.statement.localeCompare(b.statement, undefined, { sensitivity: "base" }));
        break;
      default:
        list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
        break;
    }
    return list;
  }, [rows, search, sort]);

  const layersWithData = useMemo(
    () => ALL_LAYERS.filter((layer) => filteredSorted.some((r) => r.layer === layer)),
    [filteredSorted],
  );

  const allLayersExpanded =
    layersWithData.length > 0 && layersWithData.every((layer) => isOpen(layerOpen, layer));

  const toggleExpandCollapseAll = () => {
    const nextOpen = !allLayersExpanded;
    setLayerOpen((prev) => {
      const next = { ...prev };
      for (const layer of layersWithData) {
        next[layer] = nextOpen;
      }
      return next;
    });
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FrameworkLayout title="All beliefs" back="/framework">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-4">
        {rows.length > 0 ? (
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-w-0">
            <Input
              placeholder="Search topic or question…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 max-w-md"
              aria-label="Filter beliefs"
            />
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-9 w-full sm:w-[200px]" aria-label="Sort beliefs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="confidence-desc">Confidence high → low</SelectItem>
                <SelectItem value="confidence-asc">Confidence low → high</SelectItem>
                <SelectItem value="az">A–Z by question</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="flex items-center justify-end gap-2 shrink-0">
          {rows.length > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={toggleExpandCollapseAll}>
              <ChevronsDownUp className="w-4 h-4 mr-1" />
              {allLayersExpanded ? "Collapse all" : "Expand all"}
            </Button>
          ) : null}
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add belief
          </Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No beliefs yet. Start with the{" "}
          <Link className="underline" to="/framework">
            interview
          </Link>
          , or tap{" "}
          <button type="button" className="underline" onClick={() => setDialogOpen(true)}>
            Add belief
          </button>{" "}
          to drop a quick &quot;I believe…&quot; statement.
        </p>
      ) : filteredSorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No beliefs match your search.</p>
      ) : (
        <div className="space-y-3">
          {ALL_LAYERS.map((layer) => {
            const layerRows = filteredSorted.filter((r) => r.layer === layer);
            if (layerRows.length === 0) return null;
            const meta = LAYER_META[layer];
            const avgConfidence = Math.round(
              layerRows.reduce((s, r) => s + r.confidence, 0) / layerRows.length,
            );
            const topics = [...new Set(layerRows.map((r) => r.topic))].sort((a, b) =>
              a.localeCompare(b, undefined, { sensitivity: "base" }),
            );

            return (
              <Card
                key={layer}
                className="overflow-hidden border-l-[3px] p-0 shadow-sm rounded-lg"
                style={{ borderLeftColor: meta.tone }}
              >
                <Collapsible
                  open={isOpen(layerOpen, layer)}
                  onOpenChange={(open) =>
                    setLayerOpen((prev) => ({
                      ...prev,
                      [layer]: open,
                    }))
                  }
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border/80"
                    >
                      {isOpen(layerOpen, layer) ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      <span
                        className="h-2 w-2 shrink-0 rounded-full ring-2 ring-background"
                        style={{ backgroundColor: meta.tone }}
                        aria-hidden
                      />
                      <span className="text-sm font-semibold tracking-tight text-foreground min-w-0 flex-1">
                        {meta.title}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {layerRows.length}
                      </span>
                      <span
                        className="hidden text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded-md border border-border bg-muted/40 text-muted-foreground shrink-0 sm:inline-flex"
                        title="Average confidence in this layer"
                      >
                        avg {avgConfidence}%
                      </span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="divide-y divide-border/60 bg-muted/20">
                      {topics.map((topic) => {
                        const topicRows = layerRows.filter((r) => r.topic === topic);
                        const tk = topicStorageKey(layer, topic);
                        return (
                          <Collapsible
                            key={tk}
                            open={isOpen(topicOpen, tk)}
                            onOpenChange={(open) =>
                              setTopicOpen((prev) => ({
                                ...prev,
                                [tk]: open,
                              }))
                            }
                          >
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 pl-8 text-left text-xs font-semibold text-muted-foreground hover:bg-muted/60 transition-colors"
                              >
                                {isOpen(topicOpen, tk) ? (
                                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                )}
                                <span className="min-w-0 flex-1 truncate text-foreground/90">{topic}</span>
                                <span className="tabular-nums opacity-80 shrink-0">{topicRows.length}</span>
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <ul className="border-t border-border/60 bg-background">
                                {topicRows.map((r) => (
                                  <li key={r.id} className="border-b border-border/50 last:border-b-0">
                                    <Link
                                      to={`/framework/beliefs/${r.id}`}
                                      className="flex gap-2.5 px-3 py-2 pl-10 hover:bg-muted/40 transition-colors items-start"
                                    >
                                      <span
                                        className={cn(
                                          "shrink-0 mt-0.5 text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full leading-none",
                                          confidencePillClass(r.confidence),
                                        )}
                                      >
                                        {r.confidence}%
                                      </span>
                                      <div className="min-w-0 flex-1 space-y-0.5">
                                        <div className="font-semibold text-sm leading-snug text-foreground line-clamp-1 md:line-clamp-2">
                                          {r.statement}
                                        </div>
                                        <div className="text-xs text-muted-foreground line-clamp-1 md:line-clamp-2 leading-snug">
                                          {r.answer?.trim() ? r.answer : "—"}
                                        </div>
                                      </div>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
      <QuickBeliefDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => refresh()} />
    </FrameworkLayout>
  );
}
