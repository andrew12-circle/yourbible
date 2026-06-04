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

type BeliefRow = {
  id: string;
  topic: string;
  statement: string;
  answer: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beliefId: string;
  userId: string;
  claimText: string;
  onSaved?: () => void;
};

/** Preview belief diff before saving an update from claim research. */
export default function BeliefUpdateFromClaimDialog({
  open,
  onOpenChange,
  beliefId,
  userId,
  claimText,
  onSaved,
}: Props) {
  const [belief, setBelief] = useState<BeliefRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !beliefId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("belief_nodes")
        .select("id,topic,statement,answer")
        .eq("id", beliefId)
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast({ title: "Could not load belief", description: error?.message, variant: "destructive" });
        setBelief(null);
      } else {
        const row = data as BeliefRow;
        setBelief(row);
        const seed = [
          row.answer?.trim() || row.statement,
          "",
          `After researching this claim: "${claimText.slice(0, 200)}${claimText.length > 200 ? "…" : ""}"`,
          "",
          "I now believe:",
        ].join("\n");
        setDraft(seed);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, beliefId, userId, claimText]);

  const save = async () => {
    if (!belief || !draft.trim()) return;
    setSaving(true);
    try {
      await supabase.from("belief_versions").insert({
        user_id: userId,
        belief_id: belief.id,
        snapshot: { ...belief },
      });
      const { error } = await supabase
        .from("belief_nodes")
        .update({ answer: draft.trim() })
        .eq("id", belief.id)
        .eq("user_id", userId);
      if (error) throw error;
      toast({ title: "Belief updated" });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Save failed", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const before = belief?.answer?.trim() || belief?.statement || "";
  const after = draft.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Update your belief</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Review how your answer changes after researching this claim.
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : belief ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-foreground">{belief.topic}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Before</p>
                <p className={cn("mt-1 text-xs leading-relaxed text-foreground/80", !before && "italic text-muted-foreground")}>
                  {before || "(empty)"}
                </p>
              </div>
              <div className="rounded-lg border border-primary/25 bg-primary/[0.04] p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">After (draft)</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground line-clamp-6">{after || "…"}</p>
              </div>
            </div>
            <PolishedTextarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              className="text-sm"
              placeholder="Revise your belief answer…"
            />
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">Belief not found.</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || loading || !draft.trim()} onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save belief"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
