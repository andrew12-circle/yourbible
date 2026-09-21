import { useState } from "react";
import { ExternalLink, Music2, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseWorshipMusicUrl, upsertWorshipMusicHistory } from "@/lib/livingHope/worshipMusic";
import type { WorshipMusicHistoryItem } from "@/lib/livingHope/workbookTypes";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  history: WorshipMusicHistoryItem[];
  onChange: (next: { url: string; history: WorshipMusicHistoryItem[] }) => void;
};

export function MorningWorshipMusic({ url, history, onChange }: Props) {
  const [editing, setEditing] = useState(!url);
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const selected = parseWorshipMusicUrl(url);
  const safe = selected?.openUrl.startsWith("https://") ? selected : null;
  const savedTitle = history.find((item) => item.url === url || parseWorshipMusicUrl(item.url)?.openUrl === safe?.openUrl)?.title;

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
    <section className={cn(lh.cardFlat, "p-4 space-y-3")} aria-label="Worship music">
      <div className="flex items-center gap-2"><Music2 className="h-5 w-5" /><h2 className="font-semibold">Your worship music</h2></div>
      {safe ? (
        <>
          <p className={lh.bodySm}>{savedTitle || "Your saved worship song or playlist"}</p>
          <Button asChild className="w-full sm:w-auto gap-2">
            <a href={safe.openUrl} target="_blank" rel="noopener noreferrer"><Play className="h-4 w-4" />Play worship<ExternalLink className="h-4 w-4" /></a>
          </Button>
          <p className={lh.footnote}>Opens your music without closing Morning Formula. The music app may ask you to press Play.</p>
        </>
      ) : <p className={lh.bodySm}>Add a song or playlist once. It will be ready here each morning.</p>}
      <Button type="button" variant="outline" size="sm" onClick={() => setEditing((v) => !v)}><Plus className="h-4 w-4 mr-1" />Add song or playlist</Button>
      {editing && (
        <div className="space-y-2">
          <Input aria-label="Worship song or playlist link" placeholder="Paste a YouTube Music or YouTube share link" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Input aria-label="Worship music name" placeholder="Name (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button type="button" onClick={add} disabled={!draft.trim()}>Save music</Button>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
      )}
      {history.length > 0 && <div className="space-y-1"><p className={lh.labelUpper}>Saved music</p>{history.map((item) => {
        const parsed = parseWorshipMusicUrl(item.url);
        if (!parsed?.openUrl.startsWith("https://")) return null;
        return <a key={item.id} href={parsed.openUrl} target="_blank" rel="noopener noreferrer" onClick={() => onChange({ url: item.url, history })} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><Play className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{item.title || parsed.label + " song or playlist"}</span></a>;
      })}</div>}
    </section>
  );
}
