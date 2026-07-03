import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Music2, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalMediaPlayer } from "@/contexts/GlobalMediaPlayerContext";
import { GLOBAL_MEDIA_PRESETS, globalMediaHistoryLabel } from "@/lib/media/globalMediaPlayer";
import { parseWorshipMusicUrl } from "@/lib/livingHope/worshipMusic";

/**
 * Compact "now playing" control in the sidebar footer. Shows what's playing with
 * play/pause (radio) and stop; tapping opens the full Music page to browse/pick.
 */
export function HubSidebarMediaPlayer() {
  const { url, active, playing, setPlaying, stop } = useGlobalMediaPlayer();

  const embed = useMemo(() => (url ? parseWorshipMusicUrl(url) : null), [url]);
  const isRadio = embed?.provider === "radio";
  const label = useMemo(() => {
    if (!url) return null;
    const preset = GLOBAL_MEDIA_PRESETS.find((p) => p.url === url);
    if (preset) return preset.label;
    return globalMediaHistoryLabel({ id: "", url, title: undefined });
  }, [url]);

  if (!active) {
    return (
      <Link
        to="/music"
        className="mb-3 flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-2.5 py-2 transition hover:bg-muted/40"
      >
        <Music2 className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold text-foreground">Music</span>
          <span className="block truncate text-[10px] text-muted-foreground">WAY-FM, YouTube, Spotify…</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
      </Link>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-50/40 px-2 py-1.5 dark:bg-amber-950/20">
      <Link to="/music" className="flex min-w-0 flex-1 items-center gap-2">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          <Music2 className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold text-foreground">{label}</span>
          <span className="block truncate text-[10px] text-muted-foreground">
            {isRadio ? (playing ? "Playing · Radio" : "Paused · Radio") : embed?.label ?? "Playing"}
          </span>
        </span>
      </Link>
      {isRadio ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      ) : null}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        onClick={stop}
        aria-label="Stop music"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
