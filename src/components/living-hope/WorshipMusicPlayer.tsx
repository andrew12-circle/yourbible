import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Music2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorshipMusicHistoryStrip } from "@/components/living-hope/WorshipMusicHistoryStrip";
import type { WorshipMusicHistoryItem } from "@/lib/livingHope/workbookTypes";
import {
  fetchWorshipMusicOEmbed,
  mergeWorshipHistoryMetadata,
  parseWorshipMusicUrl,
  upsertWorshipMusicHistory,
  WORSHIP_MUSIC_HINT,
  worshipMusicEmbedHeight,
  worshipMusicEmbedShellClass,
} from "@/lib/livingHope/worshipMusic";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  playlistUrl: string;
  playlistHistory: WorshipMusicHistoryItem[];
  onWorshipMusicChange: (next: { url: string; history: WorshipMusicHistoryItem[] }) => void;
};

export function WorshipMusicPlayer({ playlistUrl, playlistHistory, onWorshipMusicChange }: Props) {
  const [editing, setEditing] = useState(!playlistUrl.trim());
  const [draft, setDraft] = useState(playlistUrl);

  const embed = useMemo(() => parseWorshipMusicUrl(playlistUrl), [playlistUrl]);
  const draftEmbed = useMemo(() => parseWorshipMusicUrl(draft), [draft]);

  useEffect(() => {
    setDraft(playlistUrl);
  }, [playlistUrl]);

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

  const applyUrl = (url: string) => {
    const parsed = parseWorshipMusicUrl(url);
    const normalizedUrl = parsed?.openUrl ?? url.trim();
    const history = upsertWorshipMusicHistory(playlistHistory, normalizedUrl);
    onWorshipMusicChange({ url: normalizedUrl, history });
    setEditing(false);
    void fetchWorshipMusicOEmbed(normalizedUrl).then((metadata) => {
      if (!metadata.title && !metadata.thumbnailUrl) return;
      onWorshipMusicChange({
        url: normalizedUrl,
        history: mergeWorshipHistoryMetadata(history, normalizedUrl, metadata),
      });
    });
  };

  const saveDraft = () => {
    const trimmed = draft.trim();
    if (!parseWorshipMusicUrl(trimmed)) return;
    applyUrl(trimmed);
  };

  return (
    <section className={cn(lh.cardFlat, "mb-4 overflow-hidden p-0")} aria-label="Praise music">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Music2 className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
          <div className="min-w-0">
            <p className={cn(lh.heading, "text-[13px]")}>Praise music</p>
            <p className={cn(lh.footnote, "truncate")}>Spotify, Apple Music, or YouTube</p>
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
        <div>
          <div className={cn(worshipMusicEmbedShellClass(embed.provider), "bg-black")}>
            <iframe
              title={`Worship music — ${embed.label}`}
              src={embed.embedUrl}
              width="100%"
              height={embed.provider === "youtube" ? "100%" : worshipMusicEmbedHeight(embed.provider)}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className={cn(
                "block w-full border-0",
                embed.provider === "youtube" ? "absolute inset-0 h-full" : "",
              )}
            />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/40 bg-muted/20 px-3 py-2">
            <span className={cn(lh.footnote, "truncate")}>{embed.label}</span>
            <a
              href={embed.openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(lh.accentLink, "inline-flex shrink-0 items-center gap-1 text-[12px] font-medium")}
            >
              Open in app
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </div>
          <div className="px-3 pb-3">
            <WorshipMusicHistoryStrip
              history={playlistHistory}
              activeUrl={playlistUrl}
              onSelect={applyUrl}
            />
          </div>
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
              Save
            </Button>
          </div>
          <p className={cn(lh.footnote, "leading-snug")}>{WORSHIP_MUSIC_HINT}</p>
          {draft.trim() && !draftEmbed ? (
            <p className="text-[12px] text-destructive">
              That link isn&apos;t supported yet — try Spotify, Apple Music, or YouTube.
            </p>
          ) : null}
          {playlistHistory.length ? (
            <WorshipMusicHistoryStrip
              history={playlistHistory}
              activeUrl={playlistUrl}
              onSelect={applyUrl}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
