import { useEffect, useMemo, useRef } from "react";
import {
  parseWorshipMusicUrl,
  worshipMusicEmbedHeight,
  worshipMusicEmbedShellClass,
} from "@/lib/livingHope/worshipMusic";
import { cn } from "@/lib/utils";

/**
 * Renders the actual audio/iframe for the current media URL.
 * Shared by the sidebar player (hub) and the floating dock (non-hub) so the
 * playback surface is defined in exactly one place.
 */
export function GlobalMediaEmbed({
  url,
  label,
  className,
}: {
  url: string;
  label: string;
  className?: string;
}) {
  const embed = useMemo(() => (url ? parseWorshipMusicUrl(url) : null), [url]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (embed?.provider !== "radio" || !audioRef.current) return;
    void audioRef.current.play().catch(() => {});
  }, [embed?.provider, embed?.streamUrl, url]);

  if (!embed) return null;

  if (embed.provider === "radio" && embed.streamUrl) {
    return (
      <audio
        ref={audioRef}
        key={embed.streamUrl}
        src={embed.streamUrl}
        controls
        autoPlay
        className={cn("w-full", className)}
      />
    );
  }

  return (
    <div className={cn(worshipMusicEmbedShellClass(embed.provider), className)}>
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
  );
}
