import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FrameworkLayout from "../FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { ALL_LAYERS, LAYER_META, type FrameworkLayer } from "@/data/framework";
import { createHardQuestion } from "@/lib/framework/hardQuestions";
import { toast } from "@/hooks/use-toast";

export default function HardQuestionNewPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [title, setTitle] = useState("");
  const [framing, setFraming] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [currentThinking, setCurrentThinking] = useState("");
  const [layer, setLayer] = useState<FrameworkLayer | "">("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prefill = params.get("title");
    if (prefill) setTitle(prefill);
  }, [params]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const row = await createHardQuestion(supabase, user.id, {
      title: title.trim(),
      framing: framing.trim() || undefined,
      whyItMatters: whyItMatters.trim() || undefined,
      currentThinking: currentThinking.trim() || undefined,
      layer: layer || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setBusy(false);
    if (row) navigate(`/framework/hard-questions/${row.id}`);
    else toast({ title: "Could not create question", variant: "destructive" });
  };

  return (
    <FrameworkLayout title="New hard question" back="/framework/hard-questions">
      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Question</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you trying to resolve?"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Framing (optional)
          </label>
          <PolishedTextarea
            value={framing}
            onChange={(e) => setFraming(e.target.value)}
            rows={2}
            placeholder="Who are you explaining this to? What angle matters?"
            className="text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Why it matters to you
          </label>
          <PolishedTextarea
            value={whyItMatters}
            onChange={(e) => setWhyItMatters(e.target.value)}
            rows={2}
            className="text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Current thinking (optional)
          </label>
          <PolishedTextarea
            value={currentThinking}
            onChange={(e) => setCurrentThinking(e.target.value)}
            rows={2}
            className="text-sm"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Layer</label>
            <select
              value={layer}
              onChange={(e) => setLayer(e.target.value as FrameworkLayer | "")}
              className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
            >
              <option value="">—</option>
              {ALL_LAYERS.map((l) => (
                <option key={l} value={l}>
                  {LAYER_META[l].title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Tags</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="suffering, science (comma-separated)"
            />
          </div>
        </div>
        <Button type="button" disabled={busy || !title.trim()} onClick={() => void submit()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Open research workspace"}
        </Button>
      </div>
    </FrameworkLayout>
  );
}
