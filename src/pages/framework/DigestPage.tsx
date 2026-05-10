import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Sparkles, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Digest {
  id: string;
  range_start: string;
  range_end: string;
  title: string;
  summary: string;
  sections: { heading: string; body: string; prompts?: string[] }[];
  stats: Record<string, number>;
  created_at: string;
}

export default function DigestPage() {
  const { user, loading } = useAuth();
  const [digests, setDigests] = useState<Digest[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("framework_digests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDigests(((data as unknown) as Digest[]) ?? []);
  };

  useEffect(() => {
    load();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const generate = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("framework-weekly-digest", { body: { days: 7 } });
    setBusy(false);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Digest ready" });
      load();
    }
  };

  const remove = async (id: string) => {
    await supabase.from("framework_digests").delete().eq("id", id);
    setDigests((arr) => arr.filter((x) => x.id !== id));
  };

  return (
    <FrameworkLayout title="Weekly review" back="/framework">
      <div className="flex items-center justify-between mb-5 gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground max-w-prose">
          A pastoral, AI-written summary of what shifted in your framework — convictions
          that moved, tensions that surfaced, and what the artifacts revealed.
        </p>
        <Button onClick={generate} disabled={busy} size="sm">
          <Sparkles className={`w-3.5 h-3.5 mr-1 ${busy ? "animate-pulse" : ""}`} />
          {busy ? "Writing…" : "Generate this week's"}
        </Button>
      </div>

      {digests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Calendar className="w-5 h-5 mx-auto mb-2 opacity-60" />
          No digests yet. Generate one after you've added beliefs, artifacts, or tensions.
        </div>
      ) : (
        <ul className="space-y-6">
          {digests.map((d) => (
            <li key={d.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {new Date(d.range_start).toLocaleDateString()} – {new Date(d.range_end).toLocaleDateString()}
                  </div>
                  <h2 className="font-display text-xl leading-tight mt-0.5">{d.title}</h2>
                </div>
                <button onClick={() => remove(d.id)} className="text-xs text-muted-foreground hover:text-destructive">
                  Delete
                </button>
              </div>
              <p className="text-sm leading-relaxed mb-4">{d.summary}</p>
              <div className="flex gap-3 text-[11px] text-muted-foreground mb-4 flex-wrap">
                {Object.entries(d.stats ?? {}).map(([k, v]) => (
                  <span key={k} className="px-2 py-0.5 rounded-full bg-muted">
                    {v} {k.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
              {(d.sections ?? []).map((s, i) => (
                <section key={i} className="mb-4 last:mb-0">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                    {s.heading}
                  </h3>
                  <p className="text-sm mb-2">{s.body}</p>
                  {s.prompts && s.prompts.length > 0 && (
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      {s.prompts.map((p, j) => <li key={j}>{p}</li>)}
                    </ul>
                  )}
                </section>
              ))}
            </li>
          ))}
        </ul>
      )}
    </FrameworkLayout>
  );
}