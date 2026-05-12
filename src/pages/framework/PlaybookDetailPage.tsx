import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, Loader2, Trash2, Archive, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  summary: string | null;
  artifact_id: string | null;
  artifacts: ArtifactEmbed | null;
}

interface PlaybookDetail {
  id: string;
  user_id: string;
  teaching_id: string;
  title: string;
  why: string | null;
  steps: unknown;
  watch_outs: string[];
  scriptures: string[];
  related_belief_ids: string[];
  status: string;
  updated_at: string;
  teachings: TeachingEmbed | TeachingEmbed[] | null;
}

function normalizeTeaching(embed: TeachingEmbed | TeachingEmbed[] | null): TeachingEmbed | null {
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

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
        cadence: typeof o.cadence === "string" ? o.cadence : "once",
        done: typeof o.done === "boolean" ? o.done : false,
      };
    })
    .filter((x): x is PlaybookStep => x != null);
}

export default function PlaybookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [row, setRow] = useState<PlaybookDetail | null>(undefined);
  const [beliefs, setBeliefs] = useState<Record<string, { topic: string; statement: string }>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    const { data, error } = await supabase
      .from("playbook_items")
      .select(
        "id,user_id,teaching_id,title,why,steps,watch_outs,scriptures,related_belief_ids,status,updated_at,teachings(id,title,category,summary,artifact_id,artifacts(id,title,kind))",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) {
      setRow(null);
      return;
    }
    const r = data as PlaybookDetail;
    setRow(r);
    const ids = Array.isArray(r.related_belief_ids) ? r.related_belief_ids : [];
    if (ids.length > 0) {
      const { data: brows } = await supabase
        .from("belief_nodes")
        .select("id,topic,statement")
        .in("id", ids);
      const map: Record<string, { topic: string; statement: string }> = {};
      for (const b of brows ?? []) {
        const rec = b as { id: string; topic: string; statement: string };
        map[rec.id] = { topic: rec.topic, statement: rec.statement };
      }
      setBeliefs(map);
    } else {
      setBeliefs({});
    }
  }, [id, user]);

  useEffect(() => {
    if (!user || !id) return;
    void load();
  }, [id, load, user]);

  const persistSteps = async (steps: PlaybookStep[]) => {
    if (!row || !user) return;
    const { error } = await supabase
      .from("playbook_items")
      .update({ steps })
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Could not save steps", description: error.message, variant: "destructive" });
      return;
    }
    setRow((prev) => (prev ? { ...prev, steps } : prev));
  };

  const moveStep = (from: number, to: number) => {
    if (!row || !user) return;
    const steps = parseSteps(row.steps);
    if (from < 0 || to < 0 || from >= steps.length || to >= steps.length || from === to) return;
    const next = [...steps];
    // Single splice chain: inner remove runs first (arg eval order), then insert at original `to` index.
    next.splice(to, 0, next.splice(from, 1)[0]!);
    void persistSteps(next);
  };

  const toggleStep = (index: number) => {
    if (!row) return;
    const steps = parseSteps(row.steps);
    const next = steps.map((s, i) => (i === index ? { ...s, done: !s.done } : s));
    void persistSteps(next);
  };

  const saveWhy = async (why: string) => {
    if (!row || !user) return;
    const { error } = await supabase
      .from("playbook_items")
      .update({ why: why.trim() || null })
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setRow((prev) => (prev ? { ...prev, why: why.trim() || null } : prev));
  };

  const saveWatchOuts = async (text: string) => {
    if (!row || !user) return;
    const watch_outs = text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from("playbook_items")
      .update({ watch_outs })
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Could not save watch-outs", description: error.message, variant: "destructive" });
      return;
    }
    setRow((prev) => (prev ? { ...prev, watch_outs } : prev));
  };

  const regenerate = async () => {
    if (!row) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("generate-playbook-item", {
      body: { teaching_id: row.teaching_id },
    });
    setBusy(false);
    if (error) {
      toast({ title: "Regenerate failed", description: error.message, variant: "destructive" });
      return;
    }
    await load();
    toast({ title: "Plan refreshed" });
  };

  const archive = async () => {
    if (!row || !user) return;
    const { error } = await supabase
      .from("playbook_items")
      .update({ status: "archived" })
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Could not archive", description: error.message, variant: "destructive" });
      return;
    }
    setRow((prev) => (prev ? { ...prev, status: "archived" } : prev));
    toast({ title: "Archived" });
  };

  const remove = async () => {
    if (!row || !user) return;
    if (!window.confirm("Delete this playbook item?")) return;
    const { error } = await supabase.from("playbook_items").delete().eq("id", row.id).eq("user_id", user.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    navigate("/framework/playbook");
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (row === undefined) {
    return (
      <FrameworkLayout title="Playbook" back="/framework/playbook">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FrameworkLayout>
    );
  }
  if (row === null) {
    return <Navigate to="/framework/playbook" replace />;
  }

  const teaching = normalizeTeaching(row.teachings);
  const artifact = teaching?.artifacts;
  const steps = parseSteps(row.steps);

  return (
    <FrameworkLayout title={row.title} back="/framework/playbook" contentClassName="max-w-2xl">
      <div className="mb-6 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void regenerate()}>
          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
          Re-generate plan
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void archive()}>
          <Archive className="mr-1 h-3.5 w-3.5" />
          Archive
        </Button>
        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void remove()}>
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Why this matters</p>
      <Textarea
        key={row.id + row.updated_at}
        defaultValue={row.why ?? ""}
        rows={5}
        className="mb-8 text-sm leading-relaxed"
        onBlur={(e) => {
          const v = e.target.value;
          if (v === (row.why ?? "")) return;
          void saveWhy(v);
        }}
      />

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Steps</p>
        <span className="text-[11px] text-muted-foreground capitalize">Status: {row.status}</span>
      </div>
      <ul className="mb-8 space-y-2">
        {steps.map((st, i) => (
          <li
            key={`${i}-${st.text.slice(0, 24)}`}
            className="flex gap-2 rounded-xl border border-border/70 bg-card/60 p-3"
          >
            <Checkbox checked={!!st.done} onCheckedChange={() => toggleStep(i)} className="mt-1" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {st.cadence ?? "once"}
              </div>
              <p className={cn("text-sm leading-relaxed", st.done && "text-muted-foreground line-through")}>
                {st.text}
              </p>
            </div>
            <div className="flex flex-col gap-0.5 shrink-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={i === 0}
                aria-label="Move step up"
                onClick={() => moveStep(i, i - 1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={i === steps.length - 1}
                aria-label="Move step down"
                onClick={() => moveStep(i, i + 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Watch-outs</p>
      <Textarea
        key={`wo-${row.id}`}
        defaultValue={row.watch_outs.join("\n")}
        rows={4}
        className="mb-8 text-sm"
        placeholder="One per line"
        onBlur={(e) => {
          const v = e.target.value;
          if (v === row.watch_outs.join("\n")) return;
          void saveWatchOuts(v);
        }}
      />

      {row.scriptures.length > 0 && (
        <div className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Scriptures</p>
          <div className="flex flex-wrap gap-1.5">
            {row.scriptures.map((s) => (
              <span key={s} className="rounded-full bg-muted/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {row.related_belief_ids.length > 0 && (
        <div className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Related beliefs</p>
          <ul className="space-y-2">
            {row.related_belief_ids.map((bid) => (
              <li key={bid}>
                <Link
                  to={`/framework/beliefs/${bid}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {beliefs[bid]?.topic ?? "Belief"}
                </Link>
                {beliefs[bid] && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{beliefs[bid].statement}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {teaching && (
        <div className="rounded-xl border border-border/60 bg-muted/15 p-4 text-sm">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Source teaching</div>
          <p className="mt-1 font-medium text-foreground">{teaching.title}</p>
          {teaching.summary && <p className="mt-1 text-muted-foreground leading-relaxed">{teaching.summary}</p>}
          {artifact && (
            <div className="mt-3 text-xs">
              <Link to={`/framework/artifacts/${artifact.id}`} className="font-medium text-primary hover:underline">
                Open artifact: {artifact.title || "Untitled"}
              </Link>
            </div>
          )}
        </div>
      )}
    </FrameworkLayout>
  );
}
