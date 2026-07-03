import { newId, type WorshipMusicHistoryItem } from "@/lib/livingHope/workbookTypes";
import {
  fetchWorshipMusicOEmbed,
  mergeWorshipHistoryMetadata,
  parseWorshipMusicUrl,
  upsertWorshipMusicHistory,
  type WorshipMusicEmbed,
} from "@/lib/livingHope/worshipMusic";

const STORAGE_KEY = "yb_global_media_player_v1";

export interface GlobalMediaPlayerPersisted {
  url: string;
  history: WorshipMusicHistoryItem[];
  expanded: boolean;
}

export interface GlobalMediaPreset {
  label: string;
  url: string;
}

/** Quick picks for the sidebar music player. */
export const GLOBAL_MEDIA_PRESETS: GlobalMediaPreset[] = [
  { label: "WAY-FM", url: "https://wayfm.streamguys1.com/wayf.mp3" },
  {
    label: "Soaking worship",
    url: "https://www.youtube.com/watch?v=JPTCHPg10yE",
  },
];

function defaultState(): GlobalMediaPlayerPersisted {
  return { url: "", history: [], expanded: false };
}

export function loadGlobalMediaPlayerState(): GlobalMediaPlayerPersisted {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as GlobalMediaPlayerPersisted;
    return {
      url: String(parsed.url ?? ""),
      history: Array.isArray(parsed.history) ? parsed.history : [],
      expanded: Boolean(parsed.expanded),
    };
  } catch {
    return defaultState();
  }
}

export function saveGlobalMediaPlayerState(state: GlobalMediaPlayerPersisted): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function globalMediaHistoryLabel(item: WorshipMusicHistoryItem): string {
  if (item.title?.trim()) return item.title.trim();
  const preset = GLOBAL_MEDIA_PRESETS.find((p) => p.url === item.url);
  if (preset) return preset.label;
  const parsed = parseWorshipMusicUrl(item.url);
  return parsed?.label ?? "Music";
}

export function resolveGlobalMediaEmbed(url: string): WorshipMusicEmbed | null {
  return parseWorshipMusicUrl(url);
}

export function buildGlobalMediaHistory(
  history: WorshipMusicHistoryItem[],
  url: string,
): WorshipMusicHistoryItem[] {
  const parsed = parseWorshipMusicUrl(url);
  if (!parsed) return history;
  return upsertWorshipMusicHistory(history, url);
}

export async function enrichGlobalMediaHistoryItem(
  history: WorshipMusicHistoryItem[],
  url: string,
): Promise<WorshipMusicHistoryItem[]> {
  const metadata = await fetchWorshipMusicOEmbed(url);
  if (!metadata.title && !metadata.thumbnailUrl) return history;
  return mergeWorshipHistoryMetadata(history, url, metadata);
}

export function mergeWorkbookMediaHistory(
  globalHistory: WorshipMusicHistoryItem[],
  workbookHistory: WorshipMusicHistoryItem[],
): WorshipMusicHistoryItem[] {
  let merged = [...globalHistory];
  for (const item of workbookHistory) {
    merged = upsertWorshipMusicHistory(merged, item.url).map((entry) => {
      const same = parseWorshipMusicUrl(entry.url)?.openUrl === parseWorshipMusicUrl(item.url)?.openUrl;
      if (!same) return entry;
      return {
        ...entry,
        title: item.title ?? entry.title,
        thumbnail_url: item.thumbnail_url ?? entry.thumbnail_url,
      };
    });
  }
  return merged.slice(0, 12);
}

export function newHistoryItemFromPreset(preset: GlobalMediaPreset): WorshipMusicHistoryItem {
  const parsed = parseWorshipMusicUrl(preset.url);
  return {
    id: newId(),
    url: parsed?.openUrl ?? preset.url,
    title: preset.label,
    provider: parsed?.provider,
    added_at: new Date().toISOString(),
  };
}
