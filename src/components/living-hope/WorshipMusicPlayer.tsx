import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Music2, PanelLeftOpen, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorshipMusicHistoryStrip } from "@/components/living-hope/WorshipMusicHistoryStrip";
import { useGlobalMediaPlayer } from "@/contexts/GlobalMediaPlayerContext";
import type { WorshipMusicHistoryItem } from "@/lib/livingHope/workbookTypes";
import {
  fetchWorshipMusicOEmbed,
  mergeWorshipHistoryMetadata,
  parseWorshipMusicUrl,
  upsertWorshipMusicHistory,
  WORSHIP_MUSIC_HINT,
} from "@/lib/livingHope/worshipMusic";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  playlistUrl: string;
  playlistHistory: WorshipMusicHistoryItem[];
  onWorshipMusicChange: (next: { url: string; history: WorshipMusicHistoryItem[] }) => void;
};

export function WorshipMusicPlayer({ playlistUrl, playlistHistory, onWorshipMusicChange }: Props) {
  const globalMedia = useGlobalMediaPlayer();
  const [editing, setEditing] = useState(!playlistUrl.trim());
  const [draft, setDraft] = useState(playlistUrl);

  const embed = useMemo(() => parseWorshipMusicUrl(playlistUrl), [playlistUrl]);
  const draftEmbed = useMemo(() => parseWorshipMusicUrl(draft), [draft]);
  const globalActive =
    globalMedia.active &&
    parseWorshipMusicUrl(globalMedia.url)?.openUrl === (embed?.openUrl ?? playlistUrl.trim());

  useEffect(() => {
    setDraft(playlistUrl);
  }, [playlistUrl]);

  useEffect(() => {
    globalMedia.mergeWorkbookHistory(playlistHistory);
  }, [globalMedia.mergeWorkbookHistory, playlistHistory]);

  const enrichedOnLoadRef = useRef(false);
  useEffect(() => {
    if (enrichedOnLoadRef.current || !playlistUrl.trim()) return;
    enrichedOnLoadRef.current = true;
    void fetchWorshipMusicOEmbed(playlistUrl).then((metadata) => {
      if (!metadata.title && !metadata.thumbnailUrl) return;
      const normalizedUrl = parseWorshipMusicUrl(playlistUrl)?.openUrl ?? playlistUrl.trim();
      onWorshipMusicChange({
        url: normalizedUrl,
        history: mergeWorshipHistoryMetadata(
          upsertWorshipMusicHistory(playlistHistory, normalizedUrl),
          normalizedUrl,
          metadata,
        ),
      });
    });
  }, [onWorshipMusicChange, playlistHistory, playlistUrl]);

  const applyUrl = (url: string, autoPlay = true) => {
    const parsed = parseWorshipMusicUrl(url);
    const normalizedUrl = parsed?.openUrl ?? url.trim();
    const history = upsertWorshipMusicHistory(playlistHistory, normalizedUrl);
    onWorshipMusicChange({ url: normalizedUrl, history });
    globalMedia.syncWorkbookSelection(normalizedUrl, history);
    if (autoPlay) globalMedia.play(normalizedUrl, { expand: true });
    setEditing(false);
    void fetchWorshipMusicOEmbed(normalizedUrl).then((metadata) => {
      if (!metadata.title && !metadata.thumbnailUrl) return;
      const enriched = mergeWorshipHistoryMetadata(history, normalizedUrl, metadata);
      onWorshipMusicChange({ url: normalizedUrl, history: enriched });
      globalMedia.syncWorkbookSelection(normalizedUrl, enriched);
    });
  };

  const saveDraft = () => {
    const trimmed = draft.trim();
    if (!parseWorshipMusicUrl(trimmed)) return;
    applyUrl(trimmed);
  };

  const startPlayback = () => {
    if (!playlistUrl.trim()) {
      setEditing(true);
      return;
    }
    applyUrl(playlistUrl, true);
  };

  return (
    <section className={cn(lh.cardFlat, "mb-4 overflow-hidden p-0")} aria-label="Praise music">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Music2 className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
          <div className="min-w-0">
            <p className={cn(lh.heading, "text-[13px]")}>Praise music</p>
            <p className={cn(lh.footnote, "truncate")}>Plays in the sidebar — keeps going as you move steps</p>
          </div>
        </div>
        {playlistUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(lh.btnGhost, "h-8 shrink-0")}
            onClick={() => {
              setDraft(playlistUrl);
              setEditing((v) => !v);
            }}
            aria-expanded={editing}
          >
            <Settings2 className="mr-1 h-4 w-4" aria-hidden />
            {editing ? "Done" : "Change"}
          </Button>
        ) : null}
      </div>

      {embed && !editing ? (
        <div className="space-y-3 px-3 py-3">
          <div className={cn(lh.cardAmber, "flex items-center gap-3 p-3")}>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground">{embed.label}</p>
              <p className={cn(lh.footnote, "mt-0.5")}>
                {globalActive ? "Playing in Music player" : "Ready — start worship music"}
              </p>
            </div>
            <Button type="button" size="sm" className={lh.btnSecondary} onClick={startPlayback}>
              {globalActive ? "Show player" : "Play"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-[12px]"
              onClick={() => globalMedia.setExpanded(true)}
            >
              <PanelLeftOpen className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Open sidebar player
            </Button>
            <a
              href={embed.openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(lh.accentLink, "inline-flex h-8 items-center gap-1 text-[12px] font-medium")}
            >
              Open in app
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </div>
          <WorshipMusicHistoryStrip
            history={playlistHistory}
            activeUrl={playlistUrl}
            onSelect={(next) => applyUrl(next)}
          />
        </div>
      ) : null}

      {editing || !embed ? (
        <div className="space-y-2 px-3 py-3">
          <label className={cn(lh.label, "block")} htmlFor="worship-playlist-url">
            Your worship playlist
          </label>
          <div className="flex gap-2">
            <Input
              id="worship-playlist-url"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://open.spotify.com/playlist/…"
              className={lh.input}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveDraft();
              }}
            />
            <Button
              type="button"
              className={cn(lh.btnSecondary, "h-10 shrink-0 px-4")}
              disabled={!draftEmbed}
              onClick={saveDraft}
            >
              Play
            </Button>
          </div>
          <p className={cn(lh.footnote, "leading-snug")}>{WORSHIP_MUSIC_HINT}</p>
          {draft.trim() && !draftEmbed ? (
            <p className="text-[12px] text-destructive">
              That link isn&apos;t supported yet — try Spotify, Apple Music, YouTube, or a radio stream.
            </p>
          ) : null}
          {playlistHistory.length ? (
            <WorshipMusicHistoryStrip
              history={playlistHistory}
              activeUrl={playlistUrl}
              onSelect={(next) => applyUrl(next)}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
