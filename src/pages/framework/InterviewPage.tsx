import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  FRAMEWORK_QUESTIONS,
  FrameworkLayer,
  LAYER_META,
  ALL_LAYERS,
} from "@/data/framework";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";

interface BeliefRow {
  id: string;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
  notes: string | null;
}

export default function InterviewPage() {
  const { layer } = useParams<{ layer: FrameworkLayer }>();
  const { user, loading } = useAuth();
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState(50);
  const [notes, setNotes] = useState("");
  const [existing, setExisting] = useState<Record<string, BeliefRow>>({});
  const [saving, setSaving] = useState(false);

  const validLayer = layer && ALL_LAYERS.includes(layer);
  const questions = useMemo(
    () => (validLayer ? FRAMEWORK_QUESTIONS[layer as FrameworkLayer] : []),
    [layer, validLayer],
  );
  const q = questions[idx];

  useEffect(() => {
    if (!user || !validLayer) return;
    (async () => {
      const { data } = await supabase
        .from("belief_nodes")
        .select("id,topic,statement,answer,confidence,notes")
        .eq("user_id", user.id)
        .eq("layer", layer);
      const map: Record<string, BeliefRow> = {};
      (data as BeliefRow[] | null)?.forEach((row) => {
        map[row.statement] = row;
      });
      setExisting(map);
    })();
  }, [user, layer, validLayer]);

  useEffect(() => {
    if (!q) return;
    const row = existing[q.prompt];
    setAnswer(row?.answer ?? "");
    setConfidence(row?.confidence ?? 50);
    setNotes(row?.notes ?? "");
  }, [q, existing]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!validLayer) return <Navigate to="/framework" replace />;

  const meta = LAYER_META[layer as FrameworkLayer];

  const save = async (advance: boolean) => {
    if (!q) return;
    if (!answer.trim()) {
      if (advance && idx < questions.length - 1) setIdx(idx + 1);
      return;
    }
    setSaving(true);
    const row = existing[q.prompt];
    const payload = {
      user_id: user.id,
      layer,
      topic: q.topic,
      statement: q.prompt,
      answer: answer.trim(),
      confidence,
      notes: notes.trim() || null,
    };
    let saved: BeliefRow | null = null;
    if (row) {
      // Snapshot previous version before updating.
      await supabase.from("belief_versions").insert({
        user_id: user.id,
        belief_id: row.id,
        snapshot: { ...row },
      });
      const { data, error } = await supabase
        .from("belief_nodes")
        .update(payload)
        .eq("id", row.id)
        .select("id,topic,statement,answer,confidence,notes")
        .maybeSingle();
      if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
      else saved = data as BeliefRow;
    } else {
      const { data, error } = await supabase
        .from("belief_nodes")
        .insert(payload)
        .select("id,topic,statement,answer,confidence,notes")
        .maybeSingle();
      if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
      else saved = data as BeliefRow;
    }
    if (saved) {
      setExisting((m) => ({ ...m, [q.prompt]: saved! }));
    }
    setSaving(false);
    if (advance && idx < questions.length - 1) setIdx(idx + 1);
    else if (advance) toast({ title: "Layer complete", description: `${meta.title} saved.` });
  };

  const answeredCount = questions.filter((qq) => existing[qq.prompt]).length;

  return (
    <FrameworkLayout title={meta.title} back="/framework">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${((idx + 1) / questions.length) * 100}%`,
                background: meta.tone,
              }}
            />
          </div>
          <span className="tabular-nums">
            {idx + 1} / {questions.length} · {answeredCount} answered
          </span>
        </div>
      </div>

      {q && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div
            className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-2"
            style={{ color: meta.tone }}
          >
            {q.topic}
          </div>
          <h2 className="font-display text-2xl leading-snug mb-5">{q.prompt}</h2>

          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
            Your answer
          </label>
          <PolishedTextarea
            polishResetKey={q.prompt}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Be honest. 'I'm not sure' is a valid answer — note what you're unsure about."
            rows={6}
            className="mb-5"
          />

          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
            Confidence: <span className="tabular-nums text-foreground">{confidence}%</span>
          </label>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[confidence]}
            onValueChange={(v) => setConfidence(v[0] ?? 50)}
            className="mb-5"
          />

          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
            Where this came from (optional)
          </label>
          <PolishedTextarea
            polishResetKey={q.prompt}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="A pastor, a verse, an experience, a fear, a book…"
            rows={2}
          />

          <div className="mt-6 flex items-center gap-2 justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIdx(Math.max(0, idx - 1))}
              disabled={idx === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => save(false)} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button size="sm" onClick={() => save(true)} disabled={saving}>
                {idx === questions.length - 1 ? "Save & finish" : "Save & next"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </FrameworkLayout>
  );
}