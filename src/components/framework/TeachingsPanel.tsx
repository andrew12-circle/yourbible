import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

export type TeachingCategory =
  | "practice"
  | "principle"
  | "warning"
  | "identity"
  | "prayer"
  | "discipline"
  | "strategy"
  | "question";

export type TeachingStatus = "proposed" | "accepted" | "deferred" | "rejected";

export interface TeachingRow {
  id: string;
  user_id: string;
  artifact_id: string | null;
  title: string;
  summary: string | null;
  category: TeachingCategory;
  scriptures: string[];
  source_snippet: string | null;
  confidence: number | null;
  status: TeachingStatus;
  notes: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

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

const CATEGORY_LABEL: Record<TeachingCategory, string> = {
  practice: "Practices",
  principle: "Principles",
  warning: "Warnings",
  identity: "Identity",
  prayer: "Prayer",
  discipline: "Discipline",
  strategy: "Strategy",
  question: "Questions",
};

function confidenceDotClass(c: number | null | undefined) {
  if (c == null || Number.isNaN(c)) return "bg-muted-foreground/40";
  if (c >= 0.8) return "bg-emerald-500/90";
  if (c >= 0.6) return "bg-amber-500/85";
  return "bg-orange-400/80";
}

function isTeachingCategory(s: string): s is TeachingCategory {
  return (CATEGORY_ORDER as string[]).includes(s);
}

function parseTeachingRow(raw: Record<string, unknown>): TeachingRow | null {
  const id = typeof raw.id === "string" ? raw.id : "";
  const user_id = typeof raw.user_id === "string" ? raw.user_id : "";
  const title = typeof raw.title === "string" ? raw.title : "";
  const category = typeof raw.category === "string" ? raw.category : "";
  if (!id || !user_id || !title || !isTeachingCategory(category)) return null;
  const statusRaw = typeof raw.status === "string" ? raw.status : "";
  const status: TeachingStatus =
    statusRaw === "accepted" || statusRaw === "deferred" || statusRaw === "rejected" || statusRaw === "proposed"
      ? statusRaw
      : "proposed";
  const scriptures = Array.isArray(raw.scriptures)
    ? raw.scriptures.filter((x): x is string => typeof x === "string")
    : [];
  return {
    id,
    user_id,
    artifact_id: typeof raw.artifact_id === "string" ? raw.artifact_id : null,
    title,
    summary: typeof raw.summary === "string" ? raw.summary : null,
    category,
    scriptures,
    source_snippet: typeof raw.source_snippet === "string" ? raw.source_snippet : null,
    confidence: typeof raw.confidence === "number" ? raw.confidence : null,
    status,
    notes: typeof raw.notes === "string" ? raw.notes : null,
    decided_at: typeof raw.decided_at === "string" ? raw.decided_at : null,
    created_at: typeof raw.created_at === "string" ? raw.created_at : "",
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : "",
  };
}

function TeachingNotesCollapsible({
  row,
  notesValue,
  onNotesChange,
  onSaveNotes,
}: {
  row: TeachingRow;
  notesValue: string;
  onNotesChange: (value: string) => void;
  onSaveNotes: (value: string) => void;
}) {
  const hasNotes = notesValue.trim().length > 0;
  const [open, setOpen] = useState(hasNotes);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="pt-0.5">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-1.5 text-xs text-muted-foreground"
        >
          {hasNotes ? "Notes" : "Add notes (optional)"}
          {hasNotes ? (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden />
          ) : null}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1.5">
        <PolishedTextarea
          polishResetKey={row.id}
          rows={2}
          placeholder="Your notes (optional)"
          value={notesValue}
          onChange={(e) => onNotesChange(e.target.value)}
          className="text-sm resize-none bg-background/60"
          onAfterBlurAssist={(v) => {
            if (v === (row.notes ?? "")) return;
            onSaveNotes(v);
          }}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

interface Props {
  artifactId: string;
  artifactStatus: string;
}

export default function TeachingsPanel({ artifactId, artifactStatus }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<TeachingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [playbookByTeaching, setPlaybookByTeaching] = useState<Record<string, string>>({});
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!user || !artifactId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("teachings")
      .select("*")
      .eq("artifact_id", artifactId)
      .eq("user_id", user.id)
      .order("created_at");
    if (error) {
      toast({ title: "Could not load teachings", description: error.message, variant: "destructive" });
      setRows([]);
      setLoading(false);
      return;
    }
    const parsed = (data ?? [])
      .map((r) => parseTeachingRow(r as Record<string, unknown>))
      .filter((x): x is TeachingRow => x != null);
    setRows(parsed);

    if (parsed.length > 0) {
      const ids = parsed.map((p) => p.id);
      const { data: pb } = await supabase
        .from("playbook_items")
        .select("id,teaching_id")
        .eq("user_id", user.id)
        .in("teaching_id", ids);
      const map: Record<string, string> = {};
      for (const row of pb ?? []) {
        const rec = row as { id?: string; teaching_id?: string };
        if (typeof rec.id === "string" && typeof rec.teaching_id === "string") {
          map[rec.teaching_id] = rec.id;
        }
      }
      setPlaybookByTeaching(map);
    } else {
      setPlaybookByTeaching({});
    }
    setLoading(false);
  }, [artifactId, user]);

  useEffect(() => {
    if (!user || artifactStatus !== "ready") {
      setRows([]);
      setLoading(false);
      return;
    }
    void load();
  }, [artifactId, artifactStatus, load, user]);

  const byCategory = useMemo(() => {
    const m = new Map<TeachingCategory, TeachingRow[]>();
    for (const c of CATEGORY_ORDER) m.set(c, []);
    for (const r of rows) {
      const list = m.get(r.category);
      if (list) list.push(r);
    }
    return m;
  }, [rows]);

  const setStatus = async (row: TeachingRow, status: TeachingStatus) => {
    setBusyId(row.id);
    const decided_at = new Date().toISOString();
    const { error } = await supabase
      .from("teachings")
      .update({ status, decided_at, updated_at: decided_at })
      .eq("id", row.id)
      .eq("user_id", user?.id ?? "");
    setBusyId(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, status, decided_at } : x)));
  };

  const saveNotes = async (row: TeachingRow, notes: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("teachings")
      .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Could not save notes", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, notes: notes.trim() || null } : x)));
    setNotesDrafts((d) => {
      const next = { ...d };
      delete next[row.id];
      return next;
    });
  };

  const generatePlaybook = async (row: TeachingRow) => {
    setBusyId(row.id);
    const { data, error } = await supabase.functions.invoke<{ playbook_item?: { id: string; teaching_id: string } }>(
      "generate-playbook-item",
      { body: { teaching_id: row.id } },
    );
    setBusyId(null);
    if (error) {
      toast({ title: "Could not generate playbook", description: error.message, variant: "destructive" });
      return;
    }
    const pid = data?.playbook_item?.id;
    if (!pid) {
      toast({ title: "No playbook returned", variant: "destructive" });
      return;
    }
    setPlaybookByTeaching((prev) => ({ ...prev, [row.id]: pid }));
    toast({ title: "Playbook ready" });
  };

  if (artifactStatus !== "ready") return null;

  if (loading) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading teachings…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mb-4 rounded-lg border border-border bg-muted/15 px-3 py-3 text-sm text-muted-foreground">
        No teachings extracted yet. Run <span className="font-medium text-foreground">Re-analyze</span> after
        deploying the latest analyzer — teachings appear alongside claims and entities.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <section className="mb-6 space-y-5" aria-label="Teachings from this source">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Teachings</div>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Practices, principles, and invitations from this source — separate from raw claims. Accept what fits your
            framework, then generate a living playbook plan.
          </p>
        </div>

        {CATEGORY_ORDER.map((cat) => {
          const list = byCategory.get(cat) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={cat}>
              <h3 className="mb-2 text-sm font-semibold tracking-tight text-foreground">{CATEGORY_LABEL[cat]}</h3>
              <div className="space-y-3">
                {list.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm ring-1 ring-black/[0.02]"
                  >
                    <div className="flex items-start gap-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ring-2 ring-background",
                              confidenceDotClass(row.confidence),
                            )}
                            aria-label={`Confidence ${row.confidence != null ? Math.round(row.confidence * 100) : "unknown"}%`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs text-xs">
                          Model confidence:{" "}
                          {row.confidence != null ? `${Math.round(row.confidence * 100)}%` : "not scored"}
                          {row.source_snippet ? (
                            <>
                              <div className="mt-2 border-t border-border pt-2 font-serif text-[11px] leading-snug text-muted-foreground">
                                “{row.source_snippet}”
                              </div>
                            </>
                          ) : null}
                        </TooltipContent>
                      </Tooltip>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="font-medium leading-snug text-foreground">{row.title}</div>
                        {row.summary && (
                          <p className="text-sm leading-relaxed text-muted-foreground">{row.summary}</p>
                        )}
                        {row.scriptures.length > 0 && (
                          <div className="flex flex-wrap gap-1">
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
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            variant={row.status === "accepted" ? "default" : "outline"}
                            className="h-8"
                            disabled={busyId === row.id}
                            onClick={() => void setStatus(row, "accepted")}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant={row.status === "deferred" ? "default" : "outline"}
                            className="h-8"
                            disabled={busyId === row.id}
                            onClick={() => void setStatus(row, "deferred")}
                          >
                            Defer
                          </Button>
                          <Button
                            size="sm"
                            variant={row.status === "rejected" ? "default" : "outline"}
                            className="h-8"
                            disabled={busyId === row.id}
                            onClick={() => void setStatus(row, "rejected")}
                          >
                            Reject
                          </Button>
                          {row.status === "accepted" &&
                            (playbookByTeaching[row.id] ? (
                              <Link
                                to={`/framework/playbook/${playbookByTeaching[row.id]}`}
                                className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-sm font-medium text-primary hover:underline"
                              >
                                View in playbook
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8"
                                disabled={busyId === row.id}
                                onClick={() => void generatePlaybook(row)}
                              >
                                {busyId === row.id ? (
                                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                                )}
                                Generate playbook
                              </Button>
                            ))}
                        </div>
                        <TeachingNotesCollapsible
                          row={row}
                          notesValue={notesDrafts[row.id] ?? row.notes ?? ""}
                          onNotesChange={(v) => setNotesDrafts((d) => ({ ...d, [row.id]: v }))}
                          onSaveNotes={(v) => void saveNotes(row, v)}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </TooltipProvider>
  );
}
