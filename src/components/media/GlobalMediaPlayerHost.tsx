import { useEffect, useMemo, useRef } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Music2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalMediaPlayer } from "@/contexts/GlobalMediaPlayerContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { GLOBAL_MEDIA_PRESETS, globalMediaHistoryLabel } from "@/lib/media/globalMediaPlayer";
import {
  parseWorshipMusicUrl,
  worshipMusicEmbedHeight,
  worshipMusicEmbedShellClass,
} from "@/lib/livingHope/worshipMusic";
import { cn } from "@/lib/utils";

const MINI_BAR_H = 52;

/** Persistent player dock — iframe/audio stays mounted while you navigate the app. */
export function GlobalMediaPlayerHost() {
  const { url, active, expanded, toggleExpanded, stop } = useGlobalMediaPlayer();
  const { showHubShell } = useAppShellMode();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const embed = useMemo(() => (url ? parseWorshipMusicUrl(url) : null), [url]);
  const label = useMemo(() => {
    if (!url) return "";
    const preset = GLOBAL_MEDIA_PRESETS.find((p) => p.url === url);
    if (preset) return preset.label;
    return globalMediaHistoryLabel({ id: "", url, title: undefined });
  }, [url]);

  useEffect(() => {
    if (embed?.provider !== "radio" || !audioRef.current) return;
    void audioRef.current.play().catch(() => {});
  }, [embed?.provider, embed?.streamUrl, url]);

  if (!active || !embed) return null;

  const isRadio = embed.provider === "radio";
  const dockWidth = showHubShell ? "min(100vw, 18rem)" : "100vw";

  return (
    <>
      <div
        className={cn(
          "fixed z-[69] overflow-hidden rounded-t-lg border border-border/50 bg-black shadow-lg transition-[left,bottom,width,height,opacity] duration-300",
          expanded
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
        style={{
          left: expanded ? 0 : -9999,
          bottom: expanded ? MINI_BAR_H : 0,
          width: expanded ? dockWidth : 320,
          height: isRadio ? (expanded ? 56 : 0) : expanded ? (embed.provider === "youtube" ? 200 : worshipMusicEmbedHeight(embed.provider)) : 180,
        }}
        aria-hidden={!expanded}
      >
        {isRadio && embed.streamUrl ? (
          <audio ref={audioRef} key={embed.streamUrl} src={embed.streamUrl} controls autoPlay className="w-full" />
        ) : (
          <div className={cn(worshipMusicEmbedShellClass(embed.provider), "h-full w-full")}>
            <iframe
              title={`Now playing — ${label}`}
              src={embed.embedUrl}
              width="100%"
              height={embed.provider === "youtube" ? "100%" : worshipMusicEmbedHeight(embed.provider)}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className={cn(
                "block h-full w-full border-0",
                embed.provider === "youtube" ? "absolute inset-0" : "",
              )}
            />
          </div>
        )}
      </div>

      <div
        className={cn(
          "fixed z-[70] border border-border/50 bg-background/95 shadow-lg backdrop-blur-md",
          showHubShell ? "bottom-0 left-0 rounded-tr-xl" : "bottom-0 left-0 right-0 rounded-t-xl",
        )}
        style={{ width: showHubShell ? dockWidth : undefined }}
      >
        <div className="flex items-center gap-2 px-3 py-2" style={{ minHeight: MINI_BAR_H }}>
          <Music2 className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-foreground">{label}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {expanded ? embed.label : "Playing — tap to expand"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={toggleExpanded}
            aria-label={expanded ? "Minimize player" : "Expand player"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={stop} aria-label="Stop music">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {expanded ? (
          <div className="border-t border-border/40 px-3 pb-2 pt-1">
            <a
              href={embed.openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:underline dark:text-amber-400"
            >
              Open in app
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </div>
        ) : null}
      </div>
    </>
  );
}
