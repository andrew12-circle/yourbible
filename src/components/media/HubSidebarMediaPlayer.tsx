import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Music2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorshipMusicHistoryStrip } from "@/components/living-hope/WorshipMusicHistoryStrip";
import { useGlobalMediaPlayer } from "@/contexts/GlobalMediaPlayerContext";
import {
  GLOBAL_MEDIA_PRESETS,
  globalMediaHistoryLabel,
} from "@/lib/media/globalMediaPlayer";
import { parseWorshipMusicUrl, WORSHIP_MUSIC_HINT } from "@/lib/livingHope/worshipMusic";
import { cn } from "@/lib/utils";

export function HubSidebarMediaPlayer() {
  const { url, history, active, play, setExpanded, expanded } = useGlobalMediaPlayer();
  const [open, setOpen] = useState(active);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  const embed = useMemo(() => (url ? parseWorshipMusicUrl(url) : null), [url]);
  const nowPlayingLabel = useMemo(() => {
    if (!url) return null;
    return globalMediaHistoryLabel({ id: "", url, title: undefined });
  }, [url]);

  const saveDraft = () => {
    const trimmed = draft.trim();
    if (!parseWorshipMusicUrl(trimmed)) return;
    play(trimmed, { expand: true });
    setDraft("");
  };

  return (
    <div className="mb-3 rounded-xl border border-border/50 bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Music2 className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold text-foreground">Music</span>
          <span className="block truncate text-[10px] text-muted-foreground">
            {active && nowPlayingLabel ? nowPlayingLabel : "WAY-FM, YouTube, Spotify…"}
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 opacity-50" /> : <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />}
      </button>

      {open ? (
        <div className="space-y-2 border-t border-border/40 px-2.5 pb-2.5 pt-2">
          <div className="flex flex-wrap gap-1">
            {GLOBAL_MEDIA_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => play(preset.url, { expand: true })}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors",
                  url === preset.url
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {preset.label.includes("FM") ? (
                  <Radio className="h-3 w-3" aria-hidden />
                ) : (
                  <Music2 className="h-3 w-3" aria-hidden />
                )}
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Paste link…"
              className="h-8 text-[12px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") saveDraft();
              }}
            />
            <Button type="button" size="sm" className="h-8 shrink-0 px-2.5 text-[11px]" disabled={!parseWorshipMusicUrl(draft)} onClick={saveDraft}>
              Play
            </Button>
          </div>
          <p className="text-[10px] leading-snug text-muted-foreground">{WORSHIP_MUSIC_HINT}</p>

          {history.length ? (
            <WorshipMusicHistoryStrip
              history={history}
              activeUrl={url}
              onSelect={(next) => play(next, { expand: true })}
            />
          ) : null}

          {active && embed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full text-[11px]"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Minimize dock" : "Show player dock"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
