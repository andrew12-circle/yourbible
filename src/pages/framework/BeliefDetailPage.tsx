import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LAYER_META, FrameworkLayer } from "@/data/framework";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface Belief {
  id: string;
  layer: FrameworkLayer;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
  notes: string | null;
}
interface Scripture { id: string; ref: string; role: string }
interface Source { id: string; source_type: string; label: string }

export default function BeliefDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [b, setB] = useState<Belief | null>(null);
  const [scriptures, setScriptures] = useState<Scripture[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [newScripture, setNewScripture] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newSourceType, setNewSourceType] = useState("mentor");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data } = await supabase
        .from("belief_nodes")
        .select("id,layer,topic,statement,answer,confidence,notes")
        .eq("id", id)
        .maybeSingle();
      setB(data as Belief | null);
      const [{ data: s }, { data: src }] = await Promise.all([
        supabase.from("belief_scriptures").select("id,ref,role").eq("belief_id", id),
        supabase.from("belief_sources").select("id,source_type,label").eq("belief_id", id),
      ]);
      setScriptures((s as Scripture[]) ?? []);
      setSources((src as Source[]) ?? []);
    })();
  }, [user, id]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!b) return <FrameworkLayout title="Belief">Loading…</FrameworkLayout>;

  const meta = LAYER_META[b.layer];

  const saveBelief = async () => {
    setBusy(true);
    await supabase.from("belief_versions").insert({
      user_id: user.id,
      belief_id: b.id,
      snapshot: { ...b },
    });
    const { error } = await supabase
      .from("belief_nodes")
      .update({
        answer: b.answer,
        confidence: b.confidence,
        notes: b.notes,
      })
      .eq("id", b.id);
    setBusy(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved" });
  };

  const addScripture = async (role: "supports" | "challenges") => {
    const ref = newScripture.trim();
    if (!ref) return;
    const { data, error } = await supabase
      .from("belief_scriptures")
      .insert({ user_id: user.id, belief_id: b.id, ref, role })
      .select("id,ref,role")
      .maybeSingle();
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    if (data) setScriptures((s) => [...s, data as Scripture]);
    setNewScripture("");
  };

  const removeScripture = async (sid: string) => {
    await supabase.from("belief_scriptures").delete().eq("id", sid);
    setScriptures((s) => s.filter((x) => x.id !== sid));
  };

  const addSource = async () => {
    const label = newSource.trim();
    if (!label) return;
    const { data, error } = await supabase
      .from("belief_sources")
      .insert({ user_id: user.id, belief_id: b.id, source_type: newSourceType, label })
      .select("id,source_type,label")
      .maybeSingle();
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    if (data) setSources((s) => [...s, data as Source]);
    setNewSource("");
  };

  const removeSource = async (sid: string) => {
    await supabase.from("belief_sources").delete().eq("id", sid);
    setSources((s) => s.filter((x) => x.id !== sid));
  };

  const deleteBelief = async () => {
    if (!confirm("Delete this belief and its history?")) return;
    await supabase.from("belief_nodes").delete().eq("id", b.id);
    navigate("/framework/beliefs");
  };

  return (
    <FrameworkLayout title={b.topic} back="/framework/beliefs">
      <div className="mb-4">
        <div
          className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-1"
          style={{ color: meta.tone }}
        >
          {meta.title}
        </div>
        <h2 className="font-display text-2xl leading-snug">{b.statement}</h2>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 mb-6">
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Answer</label>
        <Textarea
          value={b.answer ?? ""}
          onChange={(e) => setB({ ...b, answer: e.target.value })}
          rows={6}
          className="mb-5"
        />
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
          Confidence: <span className="tabular-nums text-foreground">{b.confidence}%</span>
        </label>
        <Slider
          min={0} max={100} step={5}
          value={[b.confidence]}
          onValueChange={(v) => setB({ ...b, confidence: v[0] ?? 0 })}
          className="mb-5"
        />
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Notes</label>
        <Textarea
          value={b.notes ?? ""}
          onChange={(e) => setB({ ...b, notes: e.target.value })}
          rows={2}
        />
        <div className="mt-4 flex justify-between">
          <Button variant="ghost" size="sm" onClick={deleteBelief} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
          <Button onClick={saveBelief} disabled={busy} size="sm">Save</Button>
        </div>
      </div>

      <section className="mb-6">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Scriptures</h3>
        <ul className="space-y-1.5 mb-3">
          {scriptures.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm bg-muted/50 px-3 py-1.5 rounded">
              <span>
                <span className="font-medium">{s.ref}</span>{" "}
                <span className="text-xs text-muted-foreground">({s.role})</span>
              </span>
              <button onClick={() => removeScripture(s.id)} className="text-xs text-muted-foreground hover:text-destructive">
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input
            value={newScripture}
            onChange={(e) => setNewScripture(e.target.value)}
            placeholder="e.g. John 10:27"
          />
          <Button size="sm" variant="outline" onClick={() => addScripture("supports")}>+ Supports</Button>
          <Button size="sm" variant="outline" onClick={() => addScripture("challenges")}>+ Challenges</Button>
        </div>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Sources / influences</h3>
        <ul className="space-y-1.5 mb-3">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm bg-muted/50 px-3 py-1.5 rounded">
              <span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">{s.source_type}</span>
                {s.label}
              </span>
              <button onClick={() => removeSource(s.id)} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <select
            value={newSourceType}
            onChange={(e) => setNewSourceType(e.target.value)}
            className="rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="mentor">mentor</option>
            <option value="denomination">denomination</option>
            <option value="podcast">podcast</option>
            <option value="scripture">scripture</option>
            <option value="experience">experience</option>
            <option value="book">book</option>
            <option value="other">other</option>
          </select>
          <Input
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="Who or what shaped this?"
          />
          <Button size="sm" variant="outline" onClick={addSource}>Add</Button>
        </div>
      </section>
    </FrameworkLayout>
  );
}