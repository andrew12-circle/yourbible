import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Maximize2, Music2, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalMediaPlayer } from "@/contexts/GlobalMediaPlayerContext";
import { GLOBAL_MEDIA_PRESETS, globalMediaHistoryLabel } from "@/lib/media/globalMediaPlayer";
import { parseWorshipMusicUrl } from "@/lib/livingHope/worshipMusic";
import { cn } from "@/lib/utils";

type Rect = { left: number; top: number; width: number; height: number };

/**
 * Visual surface for the media player. The radio <audio> engine lives in the
 * provider (single, app-lifetime); here we render the floating radio bar and the
 * video/embed <iframe> that floats in the corner and docks into the Music page.
 */
export function GlobalMediaPlayerHost() {
  const { url, active, playing, setPlaying, dockEl, stop } = useGlobalMediaPlayer();
  const [rect, setRect] = useState<Rect | null>(null);

  const embed = useMemo(() => (url ? parseWorshipMusicUrl(url) : null), [url]);
  const isRadio = embed?.provider === "radio";
  const label = useMemo(() => {
    if (!url) return "";
    const preset = GLOBAL_MEDIA_PRESETS.find((p) => p.url === url);
    if (preset) return preset.label;
    return globalMediaHistoryLabel({ id: "", url, title: undefined });
  }, [url]);

  // Track the Music page dock slot so the video embed can align to it.
  useEffect(() => {
    if (!dockEl) {
      setRect(null);
      return;
    }
    let frame = 0;
    const measure = () => {
      const r = dockEl.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const ro = new ResizeObserver(schedule);
    ro.observe(dockEl);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [dockEl]);

  if (!active || !embed) return null;

  // ---- Radio: floating control bar (audio engine lives in the provider) ----
  if (isRadio) {
    if (dockEl) return null;
    return (
      <div className="fixed bottom-4 right-4 z-[60] w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border/60 bg-background/95 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <Music2 className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">{label}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {playing ? "Playing" : "Paused"} · Radio
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label="Open Music">
            <Link to="/music">
              <Maximize2 className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0"
            onClick={stop}
            aria-label="Stop music"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ---- Video / rich embed: persistent iframe, docked to page slot or floating ----
  const docked = Boolean(dockEl && rect);
  const floatWidth = "min(22rem, calc(100vw - 2rem))";

  const containerStyle = docked
    ? { left: rect!.left, top: rect!.top, width: rect!.width, height: rect!.height }
    : undefined;

  return (
    <div
      className={cn(
        "fixed z-[60]",
        docked ? "" : "bottom-4 right-4",
      )}
      style={
        docked
          ? containerStyle
          : { width: floatWidth }
      }
    >
      <div
        className={cn(
          "overflow-hidden bg-black shadow-xl",
          docked ? "h-full w-full rounded-xl" : "rounded-xl border border-border/60",
        )}
      >
        {docked ? null : (
          <div className="flex items-center gap-2 border-b border-border/50 bg-background/95 px-2.5 py-1.5 backdrop-blur-md">
            <Music2 className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
            <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">{label}</p>
            <Button asChild size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Open Music">
              <Link to="/music">
                <Maximize2 className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={stop}
              aria-label="Stop music"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <div className={cn("relative w-full", docked ? "h-full" : "aspect-video")}>
          <iframe
            title={`Now playing — ${label}`}
            src={embed.embedUrl}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
