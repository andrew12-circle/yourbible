import { Music2, Play } from "lucide-react";
import type { WorshipMusicHistoryItem } from "@/lib/livingHope/workbookTypes";
import { parseWorshipMusicUrl, type WorshipMusicProvider } from "@/lib/livingHope/worshipMusic";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  history: WorshipMusicHistoryItem[];
  activeUrl: string;
  onSelect: (url: string) => void;
};

const PROVIDER_LABELS: Record<WorshipMusicProvider, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  youtube: "YouTube",
};

function historyLabel(item: WorshipMusicHistoryItem): string {
  if (item.title?.trim()) return item.title.trim();
  const parsed = parseWorshipMusicUrl(item.url);
  return parsed?.label ?? "Worship link";
}

function isActiveHistoryItem(item: WorshipMusicHistoryItem, activeUrl: string): boolean {
  const active = parseWorshipMusicUrl(activeUrl);
  const candidate = parseWorshipMusicUrl(item.url);
  if (active && candidate) return active.openUrl === candidate.openUrl;
  return item.url === activeUrl;
}

export function WorshipMusicHistoryStrip({ history, activeUrl, onSelect }: Props) {
  if (!history.length) return null;

  return (
    <div className="mt-3">
      <p className={cn(lh.labelUpper, "mb-2 px-0.5")}>Past links</p>
      <div className="-mx-0.5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-0.5 pb-1">
        {history.map((item) => {
          const active = isActiveHistoryItem(item, activeUrl);
          const label = historyLabel(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.url)}
              className={cn(
                "group relative w-[132px] shrink-0 snap-start overflow-hidden rounded-xl border text-left transition-colors",
                active
                  ? "border-amber-500/60 ring-2 ring-amber-500/25"
                  : "border-border/60 hover:border-border hover:bg-muted/30",
              )}
              title={label}
            >
              <div className="relative aspect-video w-full bg-muted/40">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/15 to-muted/20">
                    <Music2 className="h-5 w-5 text-amber-600/70 dark:text-amber-500/70" aria-hidden />
                  </div>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/15">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                  </span>
                </span>
              </div>
              <div className="px-2 py-1.5">
                <p className="line-clamp-2 text-[11px] font-medium leading-snug text-foreground">{label}</p>
                {item.provider ? (
                  <p className={cn(lh.footnote, "mt-0.5")}>{PROVIDER_LABELS[item.provider]}</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
