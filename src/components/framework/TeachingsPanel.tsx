import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FloatingTabBarShell } from "@/components/navigation/FloatingTabBar";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useArtifactLayoutMode } from "@/hooks/useArtifactLayoutMode";
import {
  artifactClaimActionChip,
  artifactTeachingCardMobile,
  artifactTeachingCategoryTitle,
} from "@/lib/framework/artifactSurfaces";

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
  compactStudy,
}: {
  row: TeachingRow;
  notesValue: string;
  onNotesChange: (value: string) => void;
  onSaveNotes: (value: string) => void;
  compactStudy: boolean;
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
          className={cn(
            "gap-1.5 px-1.5 text-muted-foreground",
            compactStudy ? "h-10 min-h-10 text-sm" : "h-7 text-xs",
          )}
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

const TEACHING_VERDICT_CHIP: Record<
  TeachingStatus,
  { idle: string; active: string }
> = {
  proposed: { idle: "", active: "" },
  accepted: {
    idle: "border-border/45 hover:border-emerald-200/80",
    active:
      "border-emerald-200/90 bg-emerald-50/90 ring-emerald-100/80 dark:bg-emerald-950/40 dark:border-emerald-500/40",
  },
  deferred: {
    idle: "border-border/45 hover:border-border/70",
    active: "border-border/80 bg-muted/60 ring-border/60",
  },
  rejected: {
    idle: "border-border/45 hover:border-rose-200/80",
    active: "border-rose-200/90 bg-rose-50/90 ring-rose-100/80 dark:bg-rose-950/40 dark:border-rose-500/40",
  },
};

function TeachingVerdictChip({
  label,
  status,
  current,
  disabled,
  onClick,
}: {
  label: string;
  status: TeachingStatus;
  current: TeachingStatus;
  disabled?: boolean;
  onClick: () => void;
}) {
  const active = current === status;
  const styles = TEACHING_VERDICT_CHIP[status];

  return (
    <button
      type="button"
      className={cn(
        artifactClaimActionChip,
        "min-h-10 flex-1 justify-center px-4 sm:flex-none sm:px-3.5",
        active ? styles.active : styles.idle,
      )}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
    >
      <span className="whitespace-nowrap leading-none">{label}</span>
    </button>
  );
}

interface Props {
  artifactId: string;
  artifactStatus: string;
  /** Hide duplicate intro when nested in ArtifactCollapsibleSection (mobile/tablet). */
  hideSectionIntro?: boolean;
}

export default function TeachingsPanel({ artifactId, artifactStatus, hideSectionIntro = false }: Props) {
  const { user } = useAuth();
  const layoutMode = useArtifactLayoutMode();
  const compactStudy = layoutMode !== "desktop";
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
      <div
        className={cn(
          "mb-4 flex items-center gap-2 border border-border px-3 py-2 text-sm text-muted-foreground",
          compactStudy ? "rounded-2xl bg-card/80 py-3" : "rounded-lg bg-muted/20",
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading teachings…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "mb-4 border border-border px-3 py-3 text-sm text-muted-foreground",
          compactStudy ? "rounded-2xl bg-card/80 p-4" : "rounded-lg bg-muted/15",
        )}
      >
        No teachings extracted yet. Run <span className="font-medium text-foreground">Re-analyze</span> after
        deploying the latest analyzer — teachings appear alongside claims and entities.
      </div>
    );
  }

  const showSectionIntro = !hideSectionIntro;

  return (
    <TooltipProvider delayDuration={200}>
      <section
        className={cn(compactStudy ? "space-y-6" : "mb-6 space-y-5")}
        aria-label="Teachings from this source"
      >
        {showSectionIntro ? (
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Teachings</div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Practices, principles, and invitations from this source — separate from raw claims. Accept what fits your
              framework, then generate a living playbook plan.
            </p>
          </div>
        ) : null}

        {CATEGORY_ORDER.map((cat) => {
          const list = byCategory.get(cat) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={cat}>
              <h3
                className={cn(
                  compactStudy
                    ? cn(artifactTeachingCategoryTitle, "mb-3")
                    : "mb-2 text-sm font-semibold tracking-tight text-foreground",
                )}
              >
                {CATEGORY_LABEL[cat]}
              </h3>
              <div className={cn(compactStudy ? "space-y-4" : "space-y-3")}>
                {list.map((row) => (
                  <article
                    key={row.id}
                    className={cn(
                      compactStudy
                        ? artifactTeachingCardMobile
                        : "rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm ring-1 ring-black/[0.02]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "inline-block shrink-0 rounded-full ring-2 ring-background",
                              compactStudy ? "mt-2 h-2.5 w-2.5" : "mt-1.5 h-2 w-2",
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
                        <div
                          className={cn(
                            "leading-snug text-foreground",
                            compactStudy
                              ? "font-display text-base font-semibold tracking-tight sm:text-[15px]"
                              : "font-medium",
                          )}
                        >
                          {row.title}
                        </div>
                        {row.summary && (
                          <p
                            className={cn(
                              "leading-relaxed text-muted-foreground",
                              compactStudy ? "text-[15px] sm:text-sm" : "text-sm",
                            )}
                          >
                            {row.summary}
                          </p>
                        )}
                        {row.scriptures.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {row.scriptures.map((s) => (
                              <span
                                key={s}
                                className={cn(
                                  "rounded-full bg-muted/80 font-medium text-muted-foreground",
                                  compactStudy ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]",
                                )}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        {compactStudy ? (
                          <div className="space-y-2 pt-1">
                            <FloatingTabBarShell
                              tone="surface"
                              className="h-auto w-full max-w-none rounded-2xl px-2 py-2"
                            >
                              <div
                                role="toolbar"
                                aria-label="Teaching actions"
                                className="flex w-full min-w-0 flex-wrap items-center gap-2"
                              >
                                <TeachingVerdictChip
                                  label="Accept"
                                  status="accepted"
                                  current={row.status}
                                  disabled={busyId === row.id}
                                  onClick={() => void setStatus(row, "accepted")}
                                />
                                <TeachingVerdictChip
                                  label="Defer"
                                  status="deferred"
                                  current={row.status}
                                  disabled={busyId === row.id}
                                  onClick={() => void setStatus(row, "deferred")}
                                />
                                <TeachingVerdictChip
                                  label="Reject"
                                  status="rejected"
                                  current={row.status}
                                  disabled={busyId === row.id}
                                  onClick={() => void setStatus(row, "rejected")}
                                />
                              </div>
                            </FloatingTabBarShell>
                            {row.status === "accepted" &&
                              (playbookByTeaching[row.id] ? (
                                <Link
                                  to={`/framework/playbook/${playbookByTeaching[row.id]}`}
                                  className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-medium text-primary hover:underline"
                                >
                                  View in playbook
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-10 rounded-full px-4"
                                  disabled={busyId === row.id}
                                  onClick={() => void generatePlaybook(row)}
                                >
                                  {busyId === row.id ? (
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="mr-1.5 h-4 w-4" />
                                  )}
                                  Generate playbook
                                </Button>
                              ))}
                          </div>
                        ) : (
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
                        )}
                        <TeachingNotesCollapsible
                          row={row}
                          notesValue={notesDrafts[row.id] ?? row.notes ?? ""}
                          onNotesChange={(v) => setNotesDrafts((d) => ({ ...d, [row.id]: v }))}
                          onSaveNotes={(v) => void saveNotes(row, v)}
                          compactStudy={compactStudy}
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
