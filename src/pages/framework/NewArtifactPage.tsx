import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export default function NewArtifactPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"text" | "youtube" | "podcast" | "journal">("text");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const submit = async () => {
    if (!text.trim()) {
      toast({ title: "Paste the transcript or text first", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("artifacts")
      .insert({
        user_id: user.id,
        title: title.trim() || null,
        kind,
        url: url.trim() || null,
        raw_text: text.trim(),
        status: "analyzing",
      })
      .select("id")
      .maybeSingle();
    if (error || !data) {
      setBusy(false);
      toast({ title: "Failed", description: error?.message ?? "Unknown error", variant: "destructive" });
      return;
    }
    // Kick off analysis (fire and forget — function updates rows itself).
    supabase.functions.invoke("framework-analyze", { body: { artifact_id: data.id } }).catch((e) => {
      console.error(e);
    });
    navigate(`/framework/artifacts/${data.id}`);
  };

  return (
    <FrameworkLayout title="New artifact" back="/framework/artifacts">
      <p className="text-sm text-muted-foreground mb-5 max-w-prose">
        Paste the text of a sermon, podcast transcript, song lyrics, or your
        own journal entry. The AI will pull out the core claims and compare
        them against your framework.
      </p>

      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Title</label>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tim Keller — Suffering podcast" className="mb-4" />

      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Kind</label>
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as typeof kind)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm mb-4"
      >
        <option value="text">Text / transcript</option>
        <option value="youtube">YouTube</option>
        <option value="podcast">Podcast</option>
        <option value="journal">My journal entry</option>
      </select>

      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Source URL (optional)</label>
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="mb-4" />

      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Content</label>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        placeholder="Paste the transcript, sermon notes, lyrics, or journal entry here…"
        className="mb-5 font-serif"
      />

      <Button onClick={submit} disabled={busy}>
        {busy ? "Submitting…" : "Analyze"}
      </Button>
    </FrameworkLayout>
  );
}