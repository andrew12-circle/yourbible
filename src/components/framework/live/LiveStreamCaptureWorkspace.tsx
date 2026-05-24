import { Link } from "react-router-dom";
import { Activity, BadgeCheck, BookOpenCheck, Brain, ExternalLink, Radio, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { useLiveStreamCapture } from "@/hooks/useLiveStreamCapture";
import { formatLiveClock } from "@/lib/framework/liveStream";
import { cn } from "@/lib/utils";

type Capture = ReturnType<typeof useLiveStreamCapture>;

type Props = {
  capture: Capture;
  signedIn: boolean;
};

const layerCards = [
  {
    title: "1. Embed",
    body: "YouTube iframe player stays live in the workspace.",
    icon: Radio,
    state: "Ready",
  },
  {
    title: "2. Transcript",
    body: "Paste chunks from captions or an external STT feed.",
    icon: Activity,
    state: "MVP",
  },
  {
    title: "3. Intelligence",
    body: "Signals lift claims before the full analyzer runs.",
    icon: Brain,
    state: "Live",
  },
  {
    title: "4. App experience",
    body: "Save into artifacts so claims can be reviewed later.",
    icon: BookOpenCheck,
    state: "Connected",
  },
];

export default function LiveStreamCaptureWorkspace({ capture, signedIn }: Props) {
  const {
    title,
    setTitle,
    url,
    setUrl,
    transcriptDraft,
    setTranscriptDraft,
    chunks,
    liftedClaims,
    youTubeVideoId,
    embedUrl,
    saving,
    savedArtifactId,
    addTranscriptDraft,
    removeChunk,
    clearSession,
    saveSession,
  } = capture;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-card/40 shadow-sm">
        <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1.1fr,0.9fr] lg:p-7">
          <div className="min-w-0 space-y-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                <Radio className="h-3.5 w-3.5" aria-hidden />
                Live YouTube capture
              </div>
              <h2 className="font-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
                Think while watching.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Embed the stream, feed transcript chunks, lift claims in real time, then save the session into the belief
                and artifact system.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</span>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Sunday live teaching"
                  autoComplete="off"
                  name="live-stream-title"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">YouTube live URL</span>
                <Input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://www.youtube.com/live/..."
                  autoComplete="off"
                  name="live-stream-url"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {layerCards.map((layer) => {
              const Icon = layer.icon;
              return (
                <div key={layer.title} className="rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    <Badge variant="secondary" className="rounded-full">
                      {layer.state}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{layer.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{layer.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr),minmax(360px,0.85fr)]">
        <section className="space-y-5">
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-black shadow-sm">
            <div className="aspect-video">
              {embedUrl ? (
                <iframe
                  key={youTubeVideoId}
                  title="Live YouTube stream"
                  src={embedUrl}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center text-white">
                  <Radio className="h-9 w-9 text-white/70" aria-hidden />
                  <div>
                    <p className="font-medium">Paste a YouTube live URL</p>
                    <p className="mt-1 max-w-sm text-sm text-white/60">
                      Regular YouTube URLs also work, so you can rehearse the capture flow on a saved sermon.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card/40 p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">Live transcript feed</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Paste one or many lines. Use optional timestamps like [10:42] Speaker: text.
                </p>
              </div>
              <Badge variant="outline" className="rounded-full tabular-nums">
                {chunks.length} chunk{chunks.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <Textarea
              value={transcriptDraft}
              onChange={(event) => setTranscriptDraft(event.target.value)}
              rows={7}
              spellCheck={false}
              autoComplete="off"
              name="live-transcript-feed"
              className="font-mono text-sm"
              placeholder="Paste fresh live transcript lines here. Optional format: [10:42] Speaker: text"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" onClick={addTranscriptDraft}>
                Add transcript chunk
              </Button>
              <Button type="button" variant="ghost" onClick={clearSession} disabled={!chunks.length && !transcriptDraft}>
                Clear
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-border/60 bg-card/50 p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">Lifted claims</h3>
                <p className="mt-1 text-sm text-muted-foreground">Signal-scored moments ready for review.</p>
              </div>
              <Badge className="rounded-full tabular-nums">{liftedClaims.length}</Badge>
            </div>

            <div className="space-y-3">
              {liftedClaims.length ? (
                liftedClaims.map((claim) => (
                  <article key={claim.id} className="rounded-2xl border border-border/60 bg-background/85 p-4 shadow-sm">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {formatLiveClock(claim.startSeconds)}
                      </Badge>
                      <Badge variant="outline" className="rounded-full capitalize">
                        {claim.category.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {Math.round(claim.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-foreground">{claim.claim}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {claim.signals.map((signal) => (
                        <span key={signal} className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                          {signal.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm leading-relaxed text-muted-foreground">
                  Claims appear when transcript lines contain theological, emotional, prophetic, scripture, or action signals.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-background p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Save className="h-4 w-4 text-primary" aria-hidden />
              Save into your system
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Saving creates a YouTube artifact with normalized transcript text and inserts lifted claims for later verdicts,
              journal work, and belief comparison.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => void saveSession()} disabled={saving || !signedIn}>
                {saving ? "Saving..." : "Save live capture"}
              </Button>
              {savedArtifactId ? (
                <Button asChild variant="secondary">
                  <Link to={`/framework/artifacts/${savedArtifactId}`}>
                    Open artifact
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              ) : null}
              {!signedIn ? (
                <Button asChild variant="ghost">
                  <Link to="/auth">Sign in to save</Link>
                </Button>
              ) : null}
            </div>
          </div>

          {chunks.length ? (
            <div className="rounded-3xl border border-border/60 bg-card/35 p-4 shadow-sm sm:p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Recent transcript</h3>
              <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                {chunks.slice(-12).map((chunk) => (
                  <div key={chunk.id} className="group flex gap-2 rounded-xl border border-border/50 bg-background/80 p-3">
                    <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {formatLiveClock(chunk.startSeconds)}
                    </span>
                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground/90">
                      {chunk.speaker ? <span className="font-semibold">{chunk.speaker}: </span> : null}
                      {chunk.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeChunk(chunk.id)}
                      className={cn(
                        "h-7 w-7 shrink-0 rounded-full text-muted-foreground opacity-70 transition",
                        "hover:bg-muted hover:text-foreground group-hover:opacity-100",
                      )}
                      aria-label={`Remove transcript chunk at ${formatLiveClock(chunk.startSeconds)}`}
                    >
                      <Trash2 className="mx-auto h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {savedArtifactId ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden />
              Capture saved to artifact library.
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
