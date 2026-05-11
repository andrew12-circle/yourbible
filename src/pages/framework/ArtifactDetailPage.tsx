import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2, RefreshCw, FileText, Youtube, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface Artifact {
  id: string;
  title: string | null;
  kind: string;
  status: string;
  error: string | null;
  raw_text: string;
  url?: string | null;
}

function getYouTubeEmbed(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}?autoplay=0&rel=0` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}?autoplay=0&rel=0` : null;
    }
  } catch {
    return null;
  }
  return null;
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
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [a, setA] = useState<Artifact | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [polling, setPolling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef<number | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [savingPaste, setSavingPaste] = useState(false);

  const load = async () => {
    if (!id) return;
    const [{ data: art }, { data: cl }] = await Promise.all([
      supabase.from("artifacts").select("id,title,kind,status,error,raw_text,url").eq("id", id).maybeSingle(),
      supabase.from("artifact_claims").select("*").eq("artifact_id", id).order("created_at"),
    ]);
    setA(art as Artifact | null);
    setClaims(((cl as unknown) as Claim[]) ?? []);
  };

  useEffect(() => {
    if (!user || !id) return;
    load();
  }, [user, id]);

  // Poll while any in-flight stage is running.
  const inFlight = !!a && ["fetching", "transcribing", "analyzing"].includes(a.status);
  useEffect(() => {
    if (!inFlight) {
      setPolling(false);
      startedRef.current = null;
      setElapsed(0);
      return;
    }
    setPolling(true);
    if (startedRef.current === null) startedRef.current = Date.now();
    const poll = setInterval(load, 2500);
    const tick = setInterval(() => {
      if (startedRef.current) setElapsed(Math.floor((Date.now() - startedRef.current) / 1000));
    }, 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFlight]);

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

  const retryFetch = async () => {
    if (!a.url) return;
    await supabase.from("artifacts").update({ status: "fetching", error: null }).eq("id", a.id);
    setA({ ...a, status: "fetching", error: null });
    supabase.functions
      .invoke("framework-fetch-transcript", { body: { artifact_id: a.id, url: a.url } })
      .catch((e) => console.error(e));
  };

  const submitPasted = async () => {
    if (!pasteText.trim()) return;
    setSavingPaste(true);
    await supabase
      .from("artifacts")
      .update({ raw_text: pasteText.trim(), status: "analyzing", error: null })
      .eq("id", a.id);
    await supabase.from("artifact_claims").delete().eq("artifact_id", a.id);
    setClaims([]);
    setA({ ...a, raw_text: pasteText.trim(), status: "analyzing", error: null });
    setPasteOpen(false);
    setSavingPaste(false);
    supabase.functions
      .invoke("framework-analyze", { body: { artifact_id: a.id } })
      .catch((e) => console.error(e));
  };

  const embedUrl = a.kind === "youtube" ? getYouTubeEmbed(a.url) : null;
  const claimsDigest = claims.map((c, i) => `${i + 1}. ${c.claim}`).join("\n");

  const copyTranscript = async () => {
    if (!a.raw_text) return;
    await navigator.clipboard.writeText(a.raw_text);
    toast({ title: "Transcript copied" });
  };

  const openJournalFromArtifact = () => {
    const qs = new URLSearchParams();
    if (a.title) qs.set("artifactTitle", encodeURIComponent(a.title));
    if (a.url) qs.set("artifactUrl", encodeURIComponent(a.url));
    if (a.raw_text) qs.set("artifactTranscript", encodeURIComponent(a.raw_text.slice(0, 12000)));
    if (claimsDigest) qs.set("artifactClaims", encodeURIComponent(claimsDigest.slice(0, 6000)));
    navigate(`/journal/new?${qs.toString()}`);
  };

  const stageLabel: Record<string, string> = {
    fetching: a.kind === "youtube" ? "Watching the video and transcribing it…" : "Fetching content…",
    transcribing: "Transcribing audio…",
    analyzing: "Reading the transcript and pulling out claims…",
  };
  const stageHint: Record<string, string> = {
    fetching: "Gemini is processing the YouTube video. This usually takes 20–90 seconds depending on length.",
    transcribing: "Converting your audio to text. Usually 10–30 seconds.",
    analyzing: "Comparing claims against your framework. Usually 10–30 seconds.",
  };

  return (
    <FrameworkLayout title={a.title || "Untitled artifact"} back="/framework/artifacts">
      <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="uppercase tracking-wider">{a.kind}</span>
        <span>·</span>
        <span className="uppercase tracking-wider flex items-center gap-1">
          {inFlight && <Loader2 className="w-3 h-3 animate-spin" />}
          {a.status}
        </span>
        {!inFlight && a.status !== "error" && (
          <Button size="sm" variant="ghost" onClick={reanalyze} className="ml-auto h-7">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-analyze
          </Button>
        )}
      </div>

      {inFlight && (
        <div className="mb-5 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            {stageLabel[a.status] ?? "Working…"}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{elapsed}s</span>
          </div>
          <p className="text-xs text-muted-foreground">{stageHint[a.status]}</p>
          {a.status === "fetching" && elapsed > 90 && (
            <p className="text-xs text-amber-700 mt-2">
              Taking longer than expected. Long videos can take several minutes. You can also paste the transcript yourself below.
            </p>
          )}
          {(a.status === "fetching" || a.status === "transcribing") && (
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}>
                <FileText className="w-3.5 h-3.5 mr-1" /> Paste transcript instead
              </Button>
            </div>
          )}
        </div>
      )}

      {a.error && a.status === "error" && (
        <div className="mb-4 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="mb-2">{a.error}</div>
          <div className="flex flex-wrap gap-2">
            {a.kind === "youtube" && a.url && (
              <Button size="sm" variant="outline" onClick={retryFetch}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Try fetch again
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}>
              <FileText className="w-3.5 h-3.5 mr-1" /> Paste transcript
            </Button>
          </div>
        </div>
      )}

      {embedUrl && (
        <section className="mb-5 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Youtube className="w-4 h-4 text-red-600" /> Video
          </div>
          <iframe
            title="YouTube video"
            src={embedUrl}
            className="w-full aspect-video rounded"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </section>
      )}

      {a.raw_text && (
        <section className="mb-5 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <h2 className="text-sm font-medium">Full transcript</h2>
              <p className="text-xs text-muted-foreground">This is the complete text used for AI analysis.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyTranscript}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy
              </Button>
              <Button size="sm" onClick={openJournalFromArtifact}>Journal this</Button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-serif text-sm bg-muted/30 p-3 rounded max-h-72 overflow-auto">{a.raw_text}</pre>
        </section>
      )}

      {a.status === "ready" && claims.length > 0 && (
        <div className="mb-4 rounded border border-border bg-muted/20 p-3 text-sm">
          AI split this transcript into <span className="font-medium">{claims.length} key sections/claims</span> below so you can decide what to keep, reject, or revise in your belief framework.
        </div>
      )}

      {a.status === "ready" && claims.length === 0 && !a.error && (
        <div className="mb-4 rounded border border-border bg-muted/30 p-3 text-sm">
          The transcript came through but no clear claims were extracted. Try Re-analyze, or paste a different excerpt.
        </div>
      )}

      {pasteOpen && (
        <div className="mb-5 rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium mb-2">Paste the transcript</div>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={10}
            placeholder="Paste the YouTube transcript or your own notes…"
            className="mb-3 font-serif"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitPasted} disabled={savingPaste || !pasteText.trim()}>
              {savingPaste ? "Saving…" : "Use this & analyze"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPasteOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {a.raw_text && a.status !== "ready" && (
        <details className="mb-5 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Transcript captured ({a.raw_text.length.toLocaleString()} chars)
          </summary>
          <pre className="mt-2 whitespace-pre-wrap font-serif text-sm bg-muted/30 p-3 rounded max-h-64 overflow-auto">
            {a.raw_text.slice(0, 4000)}
            {a.raw_text.length > 4000 ? "…" : ""}
          </pre>
        </details>
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

    </FrameworkLayout>
  );
}
