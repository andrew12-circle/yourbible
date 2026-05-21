import type { LucideIcon } from "lucide-react";
import { FileText, Mic, Youtube } from "lucide-react";
import { getYouTubeVideoId, youtubeHqThumbnail, youtubeMqThumbnail } from "@/lib/youtube";

/** Stored title sometimes wrongly captures view count (e.g. "7.4K"); prefer oEmbed title from metadata when that happens. */
const VIEW_COUNT_TITLE_RE = /^\d+(?:\.\d+)?[KMB]?$/i;

export interface ArtifactMetadata {
  source?: string | null;
  channel?: string | null;
  channel_title?: string | null;
  channelTitle?: string | null;
  author_name?: string | null;
  author?: string | null;
  publisher?: string | null;
  provider_name?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
  guests?: string | string[] | null;
  description?: string | null;
  interview_guests?: string | string[] | null;
  subtitle?: string | null;
}

export interface Row {
  id: string;
  title: string | null;
  kind: string;
  status: string;
  created_at: string;
  url?: string | null;
  metadata?: ArtifactMetadata | null;
}

export const ARTIFACT_LIBRARY_STORAGE_VIEW = "framework.artifacts.view";
export const ARTIFACT_LIBRARY_STORAGE_SORT = "framework.artifacts.sort";

export type LibraryViewMode = "grid" | "list";
export type LibrarySortKey = "recent" | "az" | "source";

export type LibraryCategoryId =
  | "all"
  | "videos"
  | "podcasts"
  | "documents"
  | "chats"
  | "notes"
  | "voice";

export const LIBRARY_CATEGORY_CHIPS: { id: LibraryCategoryId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "videos", label: "Videos" },
  { id: "podcasts", label: "Podcasts" },
  { id: "documents", label: "Documents" },
  { id: "chats", label: "Chats" },
  { id: "notes", label: "Notes" },
  { id: "voice", label: "Voice" },
];

export const RECENT_SHELF_LIMIT = 12;

export const ICON_TILE =
  "flex h-[72px] w-[72px] min-w-[72px] shrink-0 items-center justify-center rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_16px_-10px_rgba(0,0,0,0.45)]";

export const YT_THUMB_WRAP =
  "relative aspect-video w-36 min-w-[9rem] shrink-0 overflow-hidden rounded-xl sm:w-44 md:w-52 bg-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_16px_-10px_rgba(0,0,0,0.35)]";

export const KIND_TILE: Record<string, { Icon: LucideIcon; gradient: string; iconColor?: string }> = {
  text: {
    Icon: FileText,
    gradient: "linear-gradient(160deg, #4C46D1 0%, #6A63FF 58%, #8E8BFF 100%)",
  },
  voice: {
    Icon: Mic,
    gradient: "linear-gradient(160deg, #0FA958 0%, #28CC73 58%, #5AF0A6 100%)",
  },
  youtube: {
    Icon: Youtube,
    gradient: "linear-gradient(160deg, #CB3F2A 0%, #FF6E4E 60%, #FF9A63 100%)",
  },
};

export function kindLabel(kind: string) {
  if (kind === "text") return "Text";
  if (kind === "voice") return "Voice";
  if (kind === "youtube") return "YouTube";
  if (kind === "chat_export") return "Chat export";
  if (kind === "pdf") return "PDF";
  if (kind === "text_file") return "Text file";
  if (kind === "podcast") return "Podcast";
  if (kind === "audio") return "Audio";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function looksLikeViewCountTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  const t = title.trim();
  if (!t) return false;
  return VIEW_COUNT_TITLE_RE.test(t);
}

export function trimStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s || null;
}

export function channelAndAuthorLine(m: ArtifactMetadata | null | undefined): string | null {
  if (!m) return null;
  const pub =
    trimStr(m.channel) ??
    trimStr(m.channel_title) ??
    trimStr(m.channelTitle) ??
    trimStr(m.publisher) ??
    null;
  const auth = trimStr(m.author_name) ?? trimStr(m.author) ?? null;
  if (pub && auth && pub.localeCompare(auth, undefined, { sensitivity: "accent" }) !== 0) {
    return `${pub} · ${auth}`;
  }
  return pub ?? auth ?? null;
}

function splitGuestishList(s: string): string[] {
  return s
    .split(/\s*(?:,|&|\/|\||·|•)\s*|\s+and\s+/i)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function namesFromGuestField(raw: string | string[] | null | undefined): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  }
  const t = raw.trim();
  if (!t) return [];
  return splitGuestishList(t);
}

function parseObviousGuestLeadLine(text: string | null | undefined): string[] | null {
  const line = trimStr(text?.split("\n")[0]);
  if (!line || line.length > 160) return null;
  const lower = line.toLowerCase();
  const skip =
    lower.includes("http") ||
    lower.includes("subscribe") ||
    lower.includes("follow us") ||
    (line.includes(".") && line.length > 90);
  if (skip) return null;

  const labeled = line.match(
    /^(?:guests?|interview(?:ee)?s?|featuring|ft\.?|w\/|with)\s*[:-]?\s*(.+)$/i,
  );
  if (labeled?.[1]) return splitGuestishList(labeled[1].replace(/\.$/, "").trim());

  if (/^interview with\b/i.test(line)) {
    const rest = line.replace(/^interview with\b/i, "").trim().replace(/\.$/, "");
    if (rest.length > 2 && rest.length < 120) return splitGuestishList(rest);
  }
  return null;
}

export function guestNamesForListRow(m: ArtifactMetadata | null | undefined): string[] {
  if (!m) return [];
  const fromIg = namesFromGuestField(m.interview_guests);
  if (fromIg.length) return fromIg;
  const fromG = namesFromGuestField(m.guests);
  if (fromG.length) return fromG;
  const fromSub = parseObviousGuestLeadLine(typeof m.subtitle === "string" ? m.subtitle : null);
  if (fromSub?.length) return fromSub;
  const fromDesc = parseObviousGuestLeadLine(typeof m.description === "string" ? m.description : null);
  return fromDesc ?? [];
}

const MAX_GUEST_NAMES_SHOWN = 3;

export function formatGuestsLabel(names: string[]): string | null {
  if (!names.length) return null;
  const shown = names.slice(0, MAX_GUEST_NAMES_SHOWN);
  const suffix = names.length > MAX_GUEST_NAMES_SHOWN ? "…" : "";
  return `Guests: ${shown.join(", ")}${suffix}`;
}

export function sourceLabelForRow(r: Row): string {
  const m = r.metadata;
  if (r.kind === "youtube") {
    const p = trimStr(m?.provider_name);
    return p || "YouTube";
  }
  const metaSource = trimStr(m?.source);
  if (metaSource) {
    if (metaSource.toLowerCase() === "youtube") return "YouTube";
    return metaSource.charAt(0).toUpperCase() + metaSource.slice(1);
  }
  return kindLabel(r.kind);
}

export function artifactDisplayTitle(r: Row): string {
  const stored = r.title?.trim() || "";
  if (looksLikeViewCountTitle(r.title)) {
    const oembed = typeof r.metadata?.title === "string" ? r.metadata.title.trim() : "";
    if (oembed) return oembed;
    if (r.kind === "youtube" && r.url && getYouTubeVideoId(r.url)) return "YouTube video";
  }
  return stored || "Untitled";
}

export function linkFullTitle(r: Row): string {
  const display = artifactDisplayTitle(r);
  const metaT = typeof r.metadata?.title === "string" ? r.metadata.title.trim() : "";
  const stored = r.title?.trim() || "";
  const candidates = [metaT, stored, display].filter((s) => s.length > 0);
  return candidates.sort((a, b) => b.length - a.length)[0] || "Untitled";
}

export function rowMatchesLibraryCategory(r: Row, cat: LibraryCategoryId): boolean {
  if (cat === "all") return true;
  if (cat === "videos") return r.kind === "youtube";
  if (cat === "podcasts") return r.kind === "podcast";
  if (cat === "documents") return r.kind === "pdf" || r.kind === "text_file";
  if (cat === "chats") return r.kind === "chat_export";
  if (cat === "notes") return r.kind === "text";
  if (cat === "voice") return r.kind === "voice" || r.kind === "audio";
  return true;
}

export function filterRowsBySearch(rows: Row[], q: string): Row[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => {
    const title = artifactDisplayTitle(r).toLowerCase();
    const metaTitle = trimStr(r.metadata?.title)?.toLowerCase() ?? "";
    const desc = trimStr(r.metadata?.description)?.toLowerCase() ?? "";
    const channel = (channelAndAuthorLine(r.metadata) ?? "").toLowerCase();
    const guests = guestNamesForListRow(r.metadata)
      .join(" ")
      .toLowerCase();
    const hay = `${title} ${metaTitle} ${desc} ${channel} ${guests}`;
    return hay.includes(needle);
  });
}

export function sortRows(rows: Row[], sortKey: LibrarySortKey): Row[] {
  const copy = [...rows];
  if (sortKey === "recent") {
    copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return copy;
  }
  if (sortKey === "az") {
    copy.sort((a, b) =>
      artifactDisplayTitle(a).localeCompare(artifactDisplayTitle(b), undefined, { sensitivity: "base" }),
    );
    return copy;
  }
  copy.sort((a, b) => {
    const s = sourceLabelForRow(a).localeCompare(sourceLabelForRow(b), undefined, { sensitivity: "base" });
    if (s !== 0) return s;
    return artifactDisplayTitle(a).localeCompare(artifactDisplayTitle(b), undefined, { sensitivity: "base" });
  });
  return copy;
}

export function youtubeThumbnailCandidates(kind: string, url: string | null | undefined, metadata: ArtifactMetadata | null | undefined): string[] {
  if (kind !== "youtube") return [];
  const list: string[] = [];
  const meta = metadata?.thumbnail_url;
  if (meta) list.push(meta);
  const id = getYouTubeVideoId(url);
  if (id) {
    const mq = youtubeMqThumbnail(id);
    const hq = youtubeHqThumbnail(id);
    for (const u of [mq, hq]) {
      if (!list.includes(u)) list.push(u);
    }
  }
  return list;
}

/** Wide (16:9) cover area for video tiles; portrait (2:3) for library-style items. */
export function tileUsesWideAspect(kind: string): boolean {
  return kind === "youtube";
}

export function hashHueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function titleInitials(title: string, maxLetters = 2): string {
  const t = title.trim() || "?";
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase();
  }
  return t.slice(0, maxLetters).toUpperCase();
}

export function readLibraryViewMode(): LibraryViewMode {
  try {
    const v = localStorage.getItem(ARTIFACT_LIBRARY_STORAGE_VIEW);
    if (v === "list" || v === "grid") return v;
  } catch {
    /* ignore */
  }
  return "grid";
}

export function writeLibraryViewMode(mode: LibraryViewMode) {
  try {
    localStorage.setItem(ARTIFACT_LIBRARY_STORAGE_VIEW, mode);
  } catch {
    /* ignore */
  }
}

export function readLibrarySortKey(): LibrarySortKey {
  try {
    const v = localStorage.getItem(ARTIFACT_LIBRARY_STORAGE_SORT);
    if (v === "recent" || v === "az" || v === "source") return v;
  } catch {
    /* ignore */
  }
  return "recent";
}

export function writeLibrarySortKey(sort: LibrarySortKey) {
  try {
    localStorage.setItem(ARTIFACT_LIBRARY_STORAGE_SORT, sort);
  } catch {
    /* ignore */
  }
}
