import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LAYER_META } from "@/data/framework";
import {
  classifyBelief,
  saveClassifiedBelief,
  type BeliefClassification,
  type BeliefInfluenceAttachment,
} from "@/lib/framework/quickBelief";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (beliefId: string) => void;
  initialText?: string;
  initialSource?: string;
  /** When set (e.g. YouTube channel), a matching row is filed under Influences on save. */
  influenceAttachment?: BeliefInfluenceAttachment | null;
}

const RELATION_TONE: Record<string, string> = {
  agree: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  refines: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  conflicts: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export default function QuickBeliefDialog({
  open,
  onOpenChange,
  onSaved,
  initialText,
  initialSource,
  influenceAttachment,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<BeliefClassification | null>(null);

  useEffect(() => {
    if (!open) return;
    setText(initialText ?? "");
    setSource(initialSource ?? "");
    setResult(null);
  }, [open, initialText, initialSource]);

  function reset() {
    setText("");
    setSource("");
    setResult(null);
    setBusy(false);
    setSaving(false);
  }

  function close() {
    onOpenChange(false);
    setTimeout(reset, 200);
  }

  async function onClassify() {
    if (!text.trim() || text.trim().length < 3) return;
    setBusy(true);
    try {
      const c = await classifyBelief(text.trim(), source.trim() || undefined);
      setResult(c);
    } catch (e: any) {
      toast({
        title: "Could not classify belief",
        description: e?.message ?? "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onAccept() {
    if (!user || !result) return;
    if (result.is_duplicate_of) {
      navigate(`/framework/beliefs/${result.is_duplicate_of}`);
      close();
      return;
    }
    setSaving(true);
    try {
      const id = await saveClassifiedBelief({
        rawText: text.trim(),
        source: source.trim() || undefined,
        classification: result,
        userId: user.id,
        influenceAttachment: influenceAttachment ?? undefined,
      });
      const layerTitle = LAYER_META[result.layer].title;
      const infName = influenceAttachment?.label?.trim();
      toast({
        title: "Belief added",
        description: infName
          ? `Filed under ${layerTitle}. ${infName} was added to your Influences (Library).`
          : `Filed under ${layerTitle}.`,
      });
      onSaved?.(id);
      close();
    } catch (e: any) {
      toast({
        title: "Could not save belief",
        description: e?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Capture a belief
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3">
            <PolishedTextarea
              key={open ? "belief-capture-open" : "belief-capture-closed"}
              autoFocus
              placeholder="I believe…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <Input
              placeholder="Source (optional) — e.g. 'Webinar — John Doe, May 11'"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Drop the raw thought. We'll classify it and slot it into your
              framework — you confirm before it's saved.
            </p>
          </div>
        ) : (
          <ReviewCard c={result} />
        )}

        <DialogFooter className="gap-2">
          {!result ? (
            <>
              <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
              <Button onClick={onClassify} disabled={busy || text.trim().length < 3}>
                {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Classify
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setResult(null)} disabled={saving}>
                Edit text
              </Button>
              <Button variant="outline" onClick={close} disabled={saving}>Discard</Button>
              <Button onClick={onAccept} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                {result.is_duplicate_of ? "Open existing" : "Save belief"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewCard({ c }: { c: BeliefClassification }) {
  const meta = LAYER_META[c.layer];
  return (
    <div className="space-y-3 text-sm">
      {c.is_duplicate_of && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 text-xs">
          This looks like a belief you already have. Open the existing one
          instead of creating a duplicate?
        </div>
      )}
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: meta.tone }}>
          {meta.title} · {c.topic}
        </div>
        <div className="font-medium leading-snug">{c.statement}</div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">Confidence {c.confidence}%</span>
        {c.tags.length > 0 && <span>·</span>}
        {c.tags.map((t) => (
          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
        ))}
      </div>
      {c.related.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
            Related beliefs
          </div>
          <ul className="space-y-1.5">
            {c.related.map((r) => (
              <li key={r.belief_id} className="flex items-start gap-2">
                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${RELATION_TONE[r.relation] ?? ""}`}>
                  {r.relation}
                </span>
                <span className="text-xs text-muted-foreground line-clamp-2 flex-1">
                  {r.note ?? "Linked on save."}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}