import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Music2, Pause, Play, Radio, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorshipMusicHistoryStrip } from "@/components/living-hope/WorshipMusicHistoryStrip";
import { useGlobalMediaPlayer } from "@/contexts/GlobalMediaPlayerContext";
import { GLOBAL_MEDIA_PRESETS, globalMediaHistoryLabel } from "@/lib/media/globalMediaPlayer";
import { parseWorshipMusicUrl, WORSHIP_MUSIC_HINT } from "@/lib/livingHope/worshipMusic";
import { cn } from "@/lib/utils";

export default function MusicPage() {
  const { user, loading } = useAuth();
  const { url, active, playing, setPlaying, stop, play, history, setDockTarget } =
    useGlobalMediaPlayer();
  const dockRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  const embed = useMemo(() => (url ? parseWorshipMusicUrl(url) : null), [url]);
  const isRadio = embed?.provider === "radio";
  const showVideoSlot = active && !isRadio;
  const label = useMemo(() => {
    if (!url) return null;
    const preset = GLOBAL_MEDIA_PRESETS.find((p) => p.url === url);
    if (preset) return preset.label;
    return globalMediaHistoryLabel({ id: "", url, title: undefined });
  }, [url]);

  // Register / release the dock slot so the persistent video embed aligns here.
  useEffect(() => {
    if (showVideoSlot && dockRef.current) {
      setDockTarget(dockRef.current);
    } else {
      setDockTarget(null);
    }
    return () => setDockTarget(null);
  }, [showVideoSlot, url, setDockTarget]);

  const saveDraft = () => {
    const trimmed = draft.trim();
    if (!parseWorshipMusicUrl(trimmed)) return;
    play(trimmed);
    setDraft("");
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-safe-28">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Music</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a station or paste a link — it keeps playing while you use the app, floating in the corner
          until you come back here.
        </p>
      </header>

      {/* Now playing */}
      {active ? (
        <section className="mb-6 rounded-2xl border border-border/60 bg-card/50 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              {isRadio ? <Radio className="h-5 w-5" aria-hidden /> : <Music2 className="h-5 w-5" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Now playing
              </p>
              <p className="truncate text-[15px] font-semibold">{label}</p>
            </div>
            {isRadio ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={() => setPlaying(!playing)}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10 shrink-0"
              onClick={stop}
              aria-label="Stop music"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {showVideoSlot ? (
            // The persistent video iframe (in GlobalMediaPlayerHost) docks over this slot.
            <div
              ref={dockRef}
              className="aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-black"
              aria-label="Video player"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Streaming live. Use the controls above or the corner player anywhere in the app.
            </p>
          )}
        </section>
      ) : null}

      {/* Presets */}
      <section className="mb-6">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Stations
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GLOBAL_MEDIA_PRESETS.map((preset) => {
            const isActive = url === preset.url;
            const presetRadio = parseWorshipMusicUrl(preset.url)?.provider === "radio";
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => play(preset.url)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 text-left transition",
                  isActive
                    ? "border-amber-500/60 bg-amber-50/60 dark:bg-amber-950/20"
                    : "border-border/60 bg-card/40 hover:border-foreground/20 hover:shadow-sm",
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  {presetRadio ? <Radio className="h-5 w-5" aria-hidden /> : <Music2 className="h-5 w-5" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-foreground">{preset.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {presetRadio ? "Live radio stream" : "Worship playlist"}
                  </span>
                </span>
                {isActive ? (
                  <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    {isRadio && !playing ? "Paused" : "Playing"}
                  </span>
                ) : (
                  <Play className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Paste a link */}
      <section className="mb-6">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Paste a link
        </h2>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://open.spotify.com/playlist/… or a YouTube / radio link"
            onKeyDown={(e) => {
              if (e.key === "Enter") saveDraft();
            }}
          />
          <Button type="button" className="shrink-0" disabled={!parseWorshipMusicUrl(draft)} onClick={saveDraft}>
            Play
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{WORSHIP_MUSIC_HINT}</p>
        {draft.trim() && !parseWorshipMusicUrl(draft) ? (
          <p className="mt-1 text-xs text-destructive">
            That link isn&apos;t supported yet — try Spotify, Apple Music, YouTube, or a radio stream.
          </p>
        ) : null}
      </section>

      {/* Past links */}
      {history.length ? (
        <section>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recent
          </h2>
          <WorshipMusicHistoryStrip history={history} activeUrl={url} onSelect={(next) => play(next)} />
        </section>
      ) : null}
    </div>
  );
}
