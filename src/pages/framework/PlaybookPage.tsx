import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ClipboardList, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { TeachingCategory } from "@/components/framework/TeachingsPanel";

type PlaybookStatus = "active" | "paused" | "complete" | "archived";

interface PlaybookStep {
  text: string;
  cadence?: string;
  done?: boolean;
}

interface ArtifactEmbed {
  id: string;
  title: string | null;
  kind: string;
}

interface TeachingEmbed {
  id: string;
  title: string;
  category: string;
  artifact_id: string | null;
  artifacts: ArtifactEmbed | null;
}

interface PlaybookRow {
  id: string;
  title: string;
  why: string | null;
  steps: unknown;
  watch_outs: string[];
  scriptures: string[];
  status: string;
  updated_at: string;
  teachings: TeachingEmbed | TeachingEmbed[] | null;
}

const STATUS_FILTER: Array<"all" | PlaybookStatus> = ["all", "active", "paused", "complete", "archived"];

const CATEGORY_LABEL: Record<string, string> = {
  practice: "Practices",
  principle: "Principles",
  warning: "Warnings",
  identity: "Identity",
  prayer: "Prayer",
  discipline: "Discipline",
  strategy: "Strategy",
  question: "Questions",
};

const CATEGORY_ORDER: TeachingCategory[] = [
  "practice",
  "principle",
  "warning",
  "identity",
  "prayer",
  "discipline",
  "strategy",
  "question",
];

function parseSteps(raw: unknown): PlaybookStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x !== "object" || x === null) return null;
      const o = x as Record<string, unknown>;
      const text = typeof o.text === "string" ? o.text.trim() : "";
      if (!text) return null;
      return {
        text,
        cadence: typeof o.cadence === "string" ? o.cadence : undefined,
        done: typeof o.done === "boolean" ? o.done : false,
      };
    })
    .filter((x): x is PlaybookStep => x != null);
}

function normalizeTeaching(embed: TeachingEmbed | TeachingEmbed[] | null): TeachingEmbed | null {
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

function matchesSearch(row: PlaybookRow, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  const why = (row.why ?? "").toLowerCase();
  const title = row.title.toLowerCase();
  if (title.includes(s) || why.includes(s)) return true;
  const steps = parseSteps(row.steps)
    .map((p) => p.text.toLowerCase())
    .join(" ");
  return steps.includes(s);
}

export default function PlaybookPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<PlaybookRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PlaybookStatus>("all");

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("playbook_items")
      .select(
        "id,title,why,steps,watch_outs,scriptures,status,updated_at,teachings(id,title,category,artifact_id,artifacts(id,title,kind))",
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "Could not load playbook", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data ?? []) as PlaybookRow[]);
    }
    setBusy(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [load, user]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return matchesSearch(r, search);
    });
  }, [rows, search, statusFilter]);

  const grouped = useMemo(() => {
    const m = new Map<string, PlaybookRow[]>();
    for (const c of CATEGORY_ORDER) m.set(c, []);
    for (const r of filtered) {
      const t = normalizeTeaching(r.teachings);
      const cat = t?.category && m.has(t.category) ? t.category : "practice";
      m.get(cat)?.push(r);
    }
    return m;
  }, [filtered]);

  const setRowStatus = async (id: string, status: PlaybookStatus) => {
    if (!user) return;
    const { error } = await supabase
      .from("playbook_items")
      .update({ status })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Could not update status", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const toggleStep = async (row: PlaybookRow, index: number) => {
    if (!user) return;
    const steps = parseSteps(row.steps);
    if (!steps[index]) return;
    const next = steps.map((s, i) => (i === index ? { ...s, done: !s.done } : s));
    const { error } = await supabase
      .from("playbook_items")
      .update({ steps: next })
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Could not update step", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, steps: next } : r)));
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FrameworkLayout title="Playbook">
      <header className="mb-8 rounded-3xl border border-border/60 bg-gradient-to-br from-muted/30 via-background to-background px-6 py-8 sm:px-8 shadow-sm">
        <div className="flex items-center gap-3 text-primary">
          <ClipboardList className="h-8 w-8 opacity-90" aria-hidden />
        </div>
        <h2 className="mt-3 font-serif text-2xl sm:text-3xl tracking-tight text-foreground">Your playbook</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Concrete plans from teachings you accepted — organized so what you learn actually shapes how you live.
        </p>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, why, or steps…"
            className="pl-9 rounded-xl bg-background/80"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTER.map((st) => (
            <Button
              key={st}
              type="button"
              size="sm"
              variant={statusFilter === st ? "default" : "outline"}
              className="h-8 rounded-full capitalize"
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {busy ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-12 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? (
            <>
              No playbook items yet. Accept a teaching on an artifact, then tap{" "}
              <span className="font-medium text-foreground">Generate playbook</span>.
            </>
          ) : (
            "Nothing matches this filter."
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {CATEGORY_ORDER.map((cat) => {
            const list = grouped.get(cat) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={cat}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_LABEL[cat] ?? cat}
                </h3>
                <div className="grid gap-4">
                  {list.map((row) => {
                    const t = normalizeTeaching(row.teachings);
                    const steps = parseSteps(row.steps).slice(0, 3);
                    const artifact = t?.artifacts;
                    return (
                      <article
                        key={row.id}
                        className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm ring-1 ring-black/[0.02]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/framework/playbook/${row.id}`}
                              className="font-semibold tracking-tight text-foreground hover:text-primary hover:underline"
                            >
                              {row.title}
                            </Link>
                            {row.why && (
                              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">{row.why}</p>
                            )}
                          </div>
                          <Select
                            value={row.status}
                            onValueChange={(v) => {
                              if (v === "active" || v === "paused" || v === "complete" || v === "archived") {
                                void setRowStatus(row.id, v);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-[132px] rounded-lg text-xs capitalize">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="paused">Paused</SelectItem>
                              <SelectItem value="complete">Complete</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {steps.length > 0 && (
                          <ul className="mt-4 space-y-2">
                            {steps.map((st, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <Checkbox
                                  checked={!!st.done}
                                  onCheckedChange={() => void toggleStep(row, i)}
                                  className="mt-0.5"
                                  aria-label={`Step ${i + 1}`}
                                />
                                <span className={cn(st.done && "text-muted-foreground line-through")}>
                                  <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                                    {st.cadence ?? "once"}
                                  </span>
                                  {st.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {row.watch_outs.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {row.watch_outs.map((w) => (
                              <span
                                key={w}
                                className="rounded-full border border-amber-200/80 bg-amber-50/80 px-2 py-0.5 text-[10px] text-amber-950"
                              >
                                {w}
                              </span>
                            ))}
                          </div>
                        )}

                        {row.scriptures.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {row.scriptures.map((s) => (
                              <span
                                key={s}
                                className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {artifact && (
                          <div className="mt-4 text-xs text-muted-foreground">
                            From artifact:{" "}
                            <Link
                              to={`/framework/artifacts/${artifact.id}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {artifact.title || "Untitled"}
                            </Link>
                            <span className="mx-1">·</span>
                            <span className="uppercase tracking-wide">{artifact.kind}</span>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </FrameworkLayout>
  );
}
