import { useId, useState } from "react";
import { ExternalLink, Headphones, Music2, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseWorshipMusicUrl, upsertWorshipMusicHistory, worshipMusicFallbackThumbnail } from "@/lib/livingHope/worshipMusic";
import type { WorshipMusicHistoryItem } from "@/lib/livingHope/workbookTypes";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  history: WorshipMusicHistoryItem[];
  onChange: (next: { url: string; history: WorshipMusicHistoryItem[] }) => void;
};

function safeImageUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  try { const parsed = new URL(value); return parsed.protocol === "https:" ? parsed.href : null; }
  catch { return null; }
}

export function MorningWorshipMusic({ url, history, onChange }: Props) {
  const editorId = useId();
  const [editing, setEditing] = useState(!parseWorshipMusicUrl(url));
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const selected = parseWorshipMusicUrl(url);
  const safe = selected?.openUrl.startsWith("https://") ? selected : null;
  const saved = safe ? history.find((item) => parseWorshipMusicUrl(item.url)?.openUrl === safe.openUrl) : undefined;
  const thumbnail = safeImageUrl(saved?.thumbnail_url) || (safe ? safeImageUrl(worshipMusicFallbackThumbnail(safe.openUrl, safe.provider)) : null);
  const savedMusic = history.flatMap((item) => {
    const parsed = parseWorshipMusicUrl(item.url);
    return parsed?.openUrl.startsWith("https://") ? [{ item, parsed }] : [];
  });

  const add = () => {
    const parsed = parseWorshipMusicUrl(draft);
    if (!parsed || !parsed.openUrl.startsWith("https://")) {
      setError("Paste a valid HTTPS YouTube, YouTube Music, Spotify, or Apple Music song or playlist link.");
      return;
    }
    const next = upsertWorshipMusicHistory(history, draft);
    if (title.trim() && next[0]) next[0] = { ...next[0], title: title.trim() };
    onChange({ url: parsed.openUrl, history: next });
    setDraft(""); setTitle(""); setError(null); setEditing(false);
  };

  return (
    <section className={cn(lh.cardFlat, "morning-music-card")} aria-label="Worship music">
      <div className="morning-music-layout">
        <div className="morning-music-art" aria-hidden="true">
          {thumbnail && failedThumbnail !== thumbnail ? (
            <img key={thumbnail} src={thumbnail} alt="" width={320} height={320} decoding="async" onError={() => setFailedThumbnail(thumbnail)} />
          ) : (
            <div className="morning-music-art-fallback"><Headphones /><span>Morning<br /><strong>Worship</strong></span></div>
          )}
        </div>
        <div className="morning-music-details">
          <div className="morning-music-heading">
            <h2><Music2 className="h-5 w-5" aria-hidden="true" />Your worship music</h2>
            {safe && <span className="morning-music-provider">{safe.label}</span>}
          </div>
          <p className="morning-music-title">{safe ? saved?.title || "Your saved worship song or playlist" : "Make room for a little worship."}</p>
          {safe ? (
            <div className="morning-music-play-row">
              <Button asChild className="morning-music-play">
                <a href={safe.openUrl} target="_blank" rel="noopener noreferrer">
                  <span className="morning-music-play-icon"><Play className="h-5 w-5" aria-hidden="true" /></span>
                  <span>Play worship</span><ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
              <p className={lh.footnote}>Opens in your music app without closing Morning Formula. Press Play there if asked.</p>
            </div>
          ) : <p className={lh.bodySm}>Add a song or playlist once. It will be ready here each morning.</p>}
          <div className="morning-music-quick-row">
            {savedMusic.length > 1 && <div className="morning-music-quick" role="group" aria-label="Quick playlists">
              {savedMusic.slice(0, 4).map(({ item, parsed }) => (
                <button key={item.id} type="button" className="morning-music-chip" aria-pressed={parsed.openUrl === safe?.openUrl}
                  onClick={() => onChange({ url: parsed.openUrl, history })} title={item.title || `${parsed.label} song or playlist`}>
                  <Headphones className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span>{item.title || parsed.label}</span>
                </button>
              ))}
            </div>}
            <Button type="button" variant="ghost" className="morning-music-change" aria-expanded={editing} aria-controls={editorId}
              onClick={() => { setEditing((v) => !v); setError(null); }}>
              <Plus className="h-4 w-4" aria-hidden="true" />{safe ? "Change music" : "Add song or playlist"}
            </Button>
          </div>
        </div>
      </div>
      {editing && (
        <div id={editorId} className="morning-music-editor">
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); add(); }}>
            <Input aria-label="Worship song or playlist link" aria-invalid={Boolean(error)} aria-describedby={error ? `${editorId}-error` : undefined}
              placeholder="Paste a YouTube, Spotify, or Apple Music link" value={draft} onChange={(e) => { setDraft(e.target.value); setError(null); }} />
            <Input aria-label="Worship music name" placeholder="Name (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Button type="submit" disabled={!draft.trim()}>Save music</Button>
            {error && <p id={`${editorId}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
          </form>
          {savedMusic.length > 0 && <div className="space-y-2">
            <p className={lh.labelUpper}>Saved music</p>
            {savedMusic.map(({ item, parsed }) => (
              <button key={item.id} type="button" aria-pressed={parsed.openUrl === safe?.openUrl} className="morning-music-saved"
                onClick={() => { onChange({ url: parsed.openUrl, history }); setEditing(false); }}>
                <Music2 className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{item.title || `${parsed.label} song or playlist`}</span>
              </button>
            ))}
          </div>}
        </div>
      )}
    </section>
  );
}
