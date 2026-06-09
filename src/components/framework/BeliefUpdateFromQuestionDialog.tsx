import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { FrameworkLayer } from "@/data/framework";
import { LAYER_META } from "@/data/framework";

type BeliefRow = {
  id: string;
  topic: string;
  statement: string;
  answer: string | null;
  layer: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  questionTitle: string;
  conclusion: string;
  suggestedBeliefId?: string | null;
  suggestedLayer?: FrameworkLayer | null;
  onSaved?: () => void;
};

export default function BeliefUpdateFromQuestionDialog({
  open,
  onOpenChange,
  userId,
  questionTitle,
  conclusion,
  suggestedBeliefId,
  suggestedLayer,
  onSaved,
}: Props) {
  const [beliefs, setBeliefs] = useState<BeliefRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newStatement, setNewStatement] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("belief_nodes")
        .select("id,topic,statement,answer,layer")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load beliefs", description: error.message, variant: "destructive" });
        setBeliefs([]);
      } else {
        const rows = (data as BeliefRow[]) ?? [];
        setBeliefs(rows);
        if (suggestedBeliefId && rows.some((b) => b.id === suggestedBeliefId)) {
          setSelectedId(suggestedBeliefId);
        } else if (rows.length) {
          setSelectedId(rows[0].id);
        } else {
          setSelectedId("new");
        }
      }
      const seed = [
        conclusion.trim(),
        "",
        `After researching: "${questionTitle.slice(0, 200)}${questionTitle.length > 200 ? "…" : ""}"`,
      ].join("\n");
      setDraft(seed);
      setNewTopic(questionTitle.slice(0, 80));
      setNewStatement(questionTitle);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId, questionTitle, conclusion, suggestedBeliefId]);

  const selectedBelief = selectedId === "new" ? null : beliefs.find((b) => b.id === selectedId) ?? null;
  const before = selectedBelief?.answer?.trim() || selectedBelief?.statement || "";

  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      if (selectedId === "new") {
        const topic = newTopic.trim() || "Hard question";
        const statement = newStatement.trim() || questionTitle;
        const layer = suggestedLayer ?? "life";
        const { data, error } = await supabase
          .from("belief_nodes")
          .insert({
            user_id: userId,
            layer,
            topic,
            statement,
            answer: draft.trim(),
            confidence: 0.7,
          })
          .select("id")
          .single();
        if (error) throw error;
        void data;
      } else if (selectedBelief) {
        await supabase.from("belief_versions").insert({
          user_id: userId,
          belief_id: selectedBelief.id,
          snapshot: { ...selectedBelief },
        });
        const { error } = await supabase
          .from("belief_nodes")
          .update({ answer: draft.trim() })
          .eq("id", selectedBelief.id)
          .eq("user_id", userId);
        if (error) throw error;
      }
      toast({ title: "Framework updated" });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Save failed", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Update your framework</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Turn your conclusion into a belief answer — update an existing belief or create a new one.
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Belief to update
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value as string)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="new">Create new belief</option>
                {beliefs.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.topic} — {b.statement.slice(0, 50)}
                  </option>
                ))}
              </select>
            </div>

            {selectedId === "new" ? (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                <input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Topic"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                />
                <input
                  value={newStatement}
                  onChange={(e) => setNewStatement(e.target.value)}
                  placeholder="Belief statement"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                />
                {suggestedLayer ? (
                  <p className="text-[10px] text-muted-foreground">
                    Layer: {LAYER_META[suggestedLayer].title}
                  </p>
                ) : null}
              </div>
            ) : selectedBelief ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Before</p>
                  <p className={cn("mt-1 text-xs leading-relaxed text-foreground/80", !before && "italic text-muted-foreground")}>
                    {before || "(empty)"}
                  </p>
                </div>
                <div className="rounded-lg border border-primary/25 bg-primary/[0.04] p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">After (draft)</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground line-clamp-6">{draft.trim() || "…"}</p>
                </div>
              </div>
            ) : null}

            <PolishedTextarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              className="text-sm"
              placeholder="Your belief answer after this research…"
            />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || loading || !draft.trim()} onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to framework"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
