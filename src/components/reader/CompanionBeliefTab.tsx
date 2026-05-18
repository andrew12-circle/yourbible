import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanion, scopeRef, scopeCoreKey } from "@/lib/reader/companionStore";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, Save, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LAYER_META, type FrameworkLayer } from "@/data/framework";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reader-dialogue`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Candidate {
  statement: string;
  topic: string;
  layer: FrameworkLayer;
  confidence: number;
  tags: string[];
  rationale?: string;
}

const LAYERS: FrameworkLayer[] = ["foundations", "life", "mechanics", "emotional"];

export function CompanionBeliefTab() {
  const { user } = useAuth();
  const { scope, threadId, entryId } = useCompanion();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [draftBody, setDraftBody] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [active, setActive] = useState(0);
  const [markCore, setMarkCore] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pull current journal body so we can pass it for proposals
  useEffect(() => {
    if (!user || !entryId) { setDraftBody(""); return; }
    supabase.from("journal_entries").select("body").eq("id", entryId).maybeSingle()
      .then(({ data }) => setDraftBody(data?.body ?? ""));
  }, [entryId, user]);

  const propose = async () => {
    if (!user || !scope) return;
    setLoading(true);
    setCandidates([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON,
          Authorization: `Bearer ${session?.access_token ?? ANON}`,
        },
        body: JSON.stringify({
          action: "propose_beliefs",
          scope,
          thread_id: threadId,
          journal_draft: draftBody,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        toast({ variant: "destructive", title: "Proposal failed", description: j.error ?? "Try again." });
        return;
      }
      const cs: Candidate[] = (j.candidates ?? []).map((c: Partial<Candidate>) => ({
        statement: c.statement ?? "",
        topic: c.topic ?? "Reflection",
        layer: (LAYERS.includes(c.layer as FrameworkLayer) ? c.layer : "foundations") as FrameworkLayer,
        confidence: Math.max(1, Math.min(100, Math.round(Number(c.confidence ?? 50)))),
        tags: Array.isArray(c.tags) ? c.tags : [],
        rationale: c.rationale,
      }));
      setCandidates(cs);
      setActive(0);
    } finally { setLoading(false); }
  };

  // Auto-propose first time
  useEffect(() => {
    if (scope && candidates.length === 0 && !loading) propose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope?.book, scope?.chapter, scope?.verses.join(",")]);

  const updateActive = (patch: Partial<Candidate>) => {
    setCandidates(cs => cs.map((c, i) => i === active ? { ...c, ...patch } : c));
  };

  const save = async () => {
    if (!user || !scope) return;
    const c = candidates[active];
    if (!c?.statement.trim()) return;
    setSaving(true);
    try {
      const { data: belief, error } = await supabase.from("belief_nodes").insert({
        user_id: user.id,
        layer: c.layer,
        topic: c.topic || "Reflection",
        statement: c.statement.trim(),
        confidence: c.confidence,
        tags: c.tags,
        is_core: markCore,
        core_scope: markCore ? scopeCoreKey(scope) : null,
        notes: c.rationale ?? null,
      }).select("id").maybeSingle();
      if (error || !belief) throw error ?? new Error("Insert failed");

      const ref = scopeRef(scope);
      // Link scripture
      await supabase.from("belief_scriptures").insert({
        user_id: user.id, belief_id: belief.id, ref, role: "supports",
      });
      // Link sources
      if (entryId) {
        await supabase.from("belief_sources").insert({
          user_id: user.id, belief_id: belief.id,
          source_type: "journal", label: `Journal · ${ref}`,
        });
        // Link from journal entry to belief
        await supabase.from("journal_entry_links").insert({
          user_id: user.id, entry_id: entryId, target_kind: "belief",
          target_ref: { belief_id: belief.id } as never,
        });
        // Backfill belief_id on the entry for legacy compat
        await supabase.from("journal_entries").update({ belief_id: belief.id }).eq("id", entryId);
      }
      if (threadId) {
        await supabase.from("belief_sources").insert({
          user_id: user.id, belief_id: belief.id,
          source_type: "chat", label: `Dialogue · ${ref}`,
        });
      }
      // Snapshot
      await supabase.from("belief_versions").insert({
        user_id: user.id, belief_id: belief.id,
        snapshot: { statement: c.statement, confidence: c.confidence, tags: c.tags, source: "reader_companion" } as never,
      });
      toast({ title: "Belief saved", description: c.statement.slice(0, 80) });
      navigate(`/framework/beliefs/${belief.id}`);
    } catch (e) {
      toast({ variant: "destructive", title: "Save failed", description: String((e as Error).message ?? e) });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        Distilling your reflection…
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-4 text-center">
        <Sparkles className="w-6 h-6 text-leather/70" />
        <p className="text-sm text-muted-foreground">Write in Journal or chat in Dialogue first, then crystallize a belief here.</p>
        <Button size="sm" variant="outline" onClick={propose} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Try anyway
        </Button>
      </div>
    );
  }

  const c = candidates[active];

  return (
    <div className="h-full flex flex-col p-3 gap-2 overflow-y-auto">
      <div className="flex gap-1 flex-wrap">
        {candidates.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`text-[11px] px-2 py-0.5 rounded-full border ${
              active === i ? "bg-leather text-paper border-leather" : "border-paper-edge text-muted-foreground hover:bg-paper-warm"
            }`}
          >Candidate {i + 1}</button>
        ))}
        <Button size="sm" variant="ghost" onClick={propose} className="ml-auto h-6 text-[11px] gap-1">
          <RefreshCw className="w-3 h-3" /> Regenerate
        </Button>
      </div>

      <PolishedTextarea
        polishResetKey={active}
        value={c.statement}
        onChange={(e) => updateActive({ statement: e.target.value })}
        rows={3}
        className="resize-none bg-paper border-paper-edge text-sm font-scripture"
      />
      {c.rationale && (
        <p className="text-[11px] italic text-muted-foreground -mt-1">{c.rationale}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] uppercase text-muted-foreground tracking-wider">Topic</label>
          <Input
            value={c.topic}
            onChange={(e) => updateActive({ topic: e.target.value })}
            className="bg-paper border-paper-edge text-sm h-8"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase text-muted-foreground tracking-wider">Layer</label>
          <select
            value={c.layer}
            onChange={(e) => updateActive({ layer: e.target.value as FrameworkLayer })}
            className="w-full h-8 rounded-md border border-paper-edge bg-paper text-sm px-2"
          >
            {LAYERS.map(l => (
              <option key={l} value={l}>{LAYER_META[l].title}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] uppercase text-muted-foreground tracking-wider">
          Confidence · {c.confidence}
        </label>
        <Slider
          value={[c.confidence]}
          onValueChange={(v) => updateActive({ confidence: v[0] })}
          min={1} max={100} step={1}
          className="mt-1"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
        <Checkbox
          checked={markCore}
          onCheckedChange={(v) => setMarkCore(!!v)}
        />
        Mark as my <strong className="ink-text">core belief</strong> for {scope ? scopeRef(scope).split(":")[0] : "this chapter"}
      </label>

      <Button
        onClick={save}
        disabled={saving || !c.statement.trim()}
        className="mt-1 bg-leather text-paper hover:bg-leather/90 gap-1.5"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save belief
      </Button>
    </div>
  );
}