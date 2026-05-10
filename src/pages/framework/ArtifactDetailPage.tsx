import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Artifact {
  id: string;
  title: string | null;
  kind: string;
  status: string;
  error: string | null;
  raw_text: string;
}
interface Claim {
  id: string;
  claim: string;
  tone: string | null;
  doctrine_tags: string[];
  scripture_supports: { ref: string; note?: string }[];
  scripture_challenges: { ref: string; note?: string }[];
  match_relation: string | null;
  matched_belief_id: string | null;
  bias_flags: string[];
  verdict: string | null;
  user_note: string | null;
}

export default function ArtifactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [a, setA] = useState<Artifact | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [polling, setPolling] = useState(false);

  const load = async () => {
    if (!id) return;
    const [{ data: art }, { data: cl }] = await Promise.all([
      supabase.from("artifacts").select("id,title,kind,status,error,raw_text").eq("id", id).maybeSingle(),
      supabase.from("artifact_claims").select("*").eq("artifact_id", id).order("created_at"),
    ]);
    setA(art as Artifact | null);
    setClaims((cl as Claim[]) ?? []);
  };

  useEffect(() => {
    if (!user || !id) return;
    load();
  }, [user, id]);

  // Poll while analyzing.
  useEffect(() => {
    if (!a || a.status !== "analyzing") {
      setPolling(false);
      return;
    }
    setPolling(true);
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.status]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!a) return <FrameworkLayout title="Artifact" back="/framework/artifacts">Loading…</FrameworkLayout>;

  const setVerdict = async (cid: string, verdict: string) => {
    await supabase.from("artifact_claims").update({ verdict }).eq("id", cid);
    setClaims((cs) => cs.map((c) => (c.id === cid ? { ...c, verdict } : c)));
  };

  const reanalyze = async () => {
    await supabase.from("artifacts").update({ status: "analyzing", error: null }).eq("id", a.id);
    await supabase.from("artifact_claims").delete().eq("artifact_id", a.id);
    setClaims([]);
    setA({ ...a, status: "analyzing", error: null });
    supabase.functions.invoke("framework-analyze", { body: { artifact_id: a.id } }).catch((e) => {
      console.error(e);
      toast({ title: "Could not start analysis", variant: "destructive" });
    });
  };

  return (
    <FrameworkLayout title={a.title || "Untitled artifact"} back="/framework/artifacts">
      <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="uppercase tracking-wider">{a.kind}</span>
        <span>·</span>
        <span className="uppercase tracking-wider flex items-center gap-1">
          {a.status === "analyzing" && <Loader2 className="w-3 h-3 animate-spin" />}
          {a.status}
        </span>
        {a.status !== "analyzing" && (
          <Button size="sm" variant="ghost" onClick={reanalyze} className="ml-auto h-7">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-analyze
          </Button>
        )}
      </div>

      {a.error && (
        <div className="mb-4 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {a.error}
        </div>
      )}

      {a.status === "analyzing" && claims.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Reading the artifact and pulling out claims… this usually takes 10–30 seconds.
        </p>
      )}

      <div className="space-y-4">
        {claims.map((c) => (
          <article key={c.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="font-display text-base leading-snug flex-1">{c.claim}</p>
              {c.verdict && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-foreground text-background">
                  {c.verdict}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3 text-[10px] uppercase tracking-wider">
              {c.tone && (
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">tone: {c.tone}</span>
              )}
              {c.doctrine_tags?.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
              ))}
              {c.match_relation && (
                <span className={`px-2 py-0.5 rounded ${
                  c.match_relation === "agree"
                    ? "bg-emerald-100 text-emerald-900"
                    : c.match_relation === "disagree"
                    ? "bg-red-100 text-red-900"
                    : "bg-amber-100 text-amber-900"
                }`}>
                  {c.match_relation === "new" ? "new to your framework" : `you ${c.match_relation}`}
                </span>
              )}
              {c.bias_flags?.map((f) => (
                <span key={f} className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                  ⚠ {f}
                </span>
              ))}
            </div>

            {(c.scripture_supports?.length ?? 0) + (c.scripture_challenges?.length ?? 0) > 0 && (
              <div className="grid sm:grid-cols-2 gap-3 mb-3 text-xs">
                <div>
                  <div className="uppercase tracking-wider text-muted-foreground mb-1">Supports</div>
                  <ul className="space-y-1">
                    {c.scripture_supports?.map((s, i) => (
                      <li key={i}><span className="font-medium">{s.ref}</span>{s.note ? ` — ${s.note}` : ""}</li>
                    )) || <li className="text-muted-foreground">—</li>}
                  </ul>
                </div>
                <div>
                  <div className="uppercase tracking-wider text-muted-foreground mb-1">Challenges</div>
                  <ul className="space-y-1">
                    {c.scripture_challenges?.map((s, i) => (
                      <li key={i}><span className="font-medium">{s.ref}</span>{s.note ? ` — ${s.note}` : ""}</li>
                    )) || <li className="text-muted-foreground">—</li>}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={c.verdict === "keep" ? "default" : "outline"} onClick={() => setVerdict(c.id, "keep")}>Keep</Button>
              <Button size="sm" variant={c.verdict === "reject" ? "default" : "outline"} onClick={() => setVerdict(c.id, "reject")}>Reject</Button>
              <Button size="sm" variant={c.verdict === "updated" ? "default" : "outline"} onClick={() => setVerdict(c.id, "updated")}>Update my belief</Button>
            </div>
          </article>
        ))}
      </div>

      {polling && (
        <p className="mt-6 text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Watching for new claims…
        </p>
      )}

      <details className="mt-8 text-sm">
        <summary className="cursor-pointer text-muted-foreground">Original text</summary>
        <pre className="mt-2 whitespace-pre-wrap font-serif text-sm bg-muted/30 p-3 rounded">
          {a.raw_text}
        </pre>
      </details>
    </FrameworkLayout>
  );
}