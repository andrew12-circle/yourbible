import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Loader2,
  RefreshCw,
  FileText,
  Youtube,
  ArrowRight,
  Quote,
  ExternalLink,
  Bookmark,
  StickyNote,
  Sparkles,
  NotebookPen,
  Maximize2,
  MessageCircle,
  LayoutList,
  GripVertical,
  MoreHorizontal,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { BeliefInfluenceAttachment } from "@/lib/framework/quickBelief";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import QuickBeliefDialog from "@/components/framework/QuickBeliefDialog";
import { floatingJournalPlaybackRef } from "@/lib/journal/floatingJournalPlaybackRef";
import { floatingJournalInsertRef } from "@/lib/journal/floatingJournalInsertRef";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";
import TranscriptPanel from "@/components/framework/TranscriptPanel";
import ArtifactEntitiesPanel from "@/components/framework/ArtifactEntitiesPanel";
import TeachingsPanel from "@/components/framework/TeachingsPanel";
import {
  countTimedTranscriptLines,
  looksLikeYoutubeShowTranscriptPaste,
  needsTranscriptNormalization,
  normalizePastedTranscript,
} from "@/lib/normalizePastedTranscript";
import {
  collectTranscriptTextOverlappingInclusiveRange,
  formatTranscriptClock,
  splitTranscript,
  type TranscriptSegment,
} from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";
import type { YoutubeChapter } from "@/lib/youtubeChapters";

interface Artifact {
  id: string;
  title: string | null;
  kind: string;
  status: string;
  error: string | null;
  raw_text: string;
  url?: string | null;
  metadata?: ArtifactMetadata | null;
}

interface ArtifactMetadata {
  source?: string;
  channel_title?: string | null;
  channel_url?: string | null;
  thumbnail_url?: string | null;
  provider_name?: string | null;
  duration_seconds?: number | null;
  title?: string;
  youtube_chapters?: YoutubeChapter[];
  youtube_chapters_source?: string;
  video_id?: string;
}

type YouTubePlayer = {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideo?: () => void;
  destroy: () => void;
};

type YouTubePlayerEvent = {
  data?: number;
  target?: YouTubePlayer;
};

declare global {
  interface Window {
    YT?: {
      Player?: new (
        element: HTMLElement,
        options: {
          videoId: string;
          width?: string;
          height?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: YouTubePlayerEvent) => void;
            onStateChange?: (event: YouTubePlayerEvent) => void;
          };
        },
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youTubeApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("YouTube player unavailable"));
  if (window.YT?.Player) return Promise.resolve();
  if (youTubeApiPromise) return youTubeApiPromise;

  youTubeApiPromise = new Promise<void>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => {
      youTubeApiPromise = null;
      reject(new Error("YouTube player timed out"));
    }, 10000);

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      window.clearTimeout(timeout);
      resolve();
    };

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) return;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => {
      window.clearTimeout(timeout);
      youTubeApiPromise = null;
      reject(new Error("YouTube player failed to load"));
    };
    document.head.appendChild(tag);
  });

  return youTubeApiPromise;
}

function getYouTubeVideoId(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

function titleLooksBad(title: string | null | undefined): boolean {
  if (!title) return true;
  const t = title.trim();
  if (!t) return true;
  if (t.length <= 5 && /^\d+(?:\.\d+)?[KMB]?$/i.test(t)) return true;
  if (/^\d+(?:\.\d+)?[KMB]?\s+(views?|subscribers?)\b/i.test(t)) return true;
  return false;
}

function getYouTubeEmbed(url?: string | null, startSeconds = 0) {
  if (!url) return null;
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  const start = Math.max(0, Math.floor(startSeconds));
  const params = new URLSearchParams({
    autoplay: start > 0 ? "1" : "0",
    enablejsapi: "1",
    rel: "0",
  });
  if (start > 0) params.set("start", String(start));
  if (typeof window !== "undefined") params.set("origin", window.location.origin);
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

function youTubeStateLabel(state?: number) {
  switch (state) {
    case 0:
      return "ended";
    case 1:
      return "playing";
    case 2:
      return "paused";
    case 3:
      return "buffering";
    case 5:
      return "cued";
    default:
      return "idle";
  }
}

const ARTIFACT_YOUTUBE_PIP_SS_PREFIX = "yb_artifact_youtube_pip_v1:";
const PIP_HEADER_PX = 28;
const PIP_MIN_W = 160;
const PIP_MAX_W = 640;
const PIP_VIEWPORT_PAD = 8;

type ArtifactPipLayout = { left: number; top: number; width: number };

function pipSessionKey(artifactId: string) {
  return `${ARTIFACT_YOUTUBE_PIP_SS_PREFIX}${artifactId}`;
}

function pipTotalHeightPx(videoWidth: number) {
  return PIP_HEADER_PX + (videoWidth * 9) / 16;
}

function readPipLayoutFromSession(artifactId: string): ArtifactPipLayout | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(pipSessionKey(artifactId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ArtifactPipLayout>;
    if (
      typeof parsed.left !== "number" ||
      typeof parsed.top !== "number" ||
      typeof parsed.width !== "number" ||
      !Number.isFinite(parsed.left) ||
      !Number.isFinite(parsed.top) ||
      !Number.isFinite(parsed.width)
    ) {
      return null;
    }
    return { left: parsed.left, top: parsed.top, width: parsed.width };
  } catch {
    return null;
  }
}

function writePipLayoutToSession(artifactId: string, layout: ArtifactPipLayout) {
  try {
    sessionStorage.setItem(pipSessionKey(artifactId), JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

function defaultArtifactPipLayout(): ArtifactPipLayout {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const w = Math.min(300, PIP_MAX_W, vw - PIP_VIEWPORT_PAD * 2);
  const width = Math.max(PIP_MIN_W, w);
  const totalH = pipTotalHeightPx(width);
  return {
    left: Math.max(PIP_VIEWPORT_PAD, vw - width - PIP_VIEWPORT_PAD),
    top: Math.max(PIP_VIEWPORT_PAD, vh - totalH - PIP_VIEWPORT_PAD),
    width,
  };
}

function maxPipVideoWidthForTopLeft(left: number, top: number): number {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const byRight = vw - left - PIP_VIEWPORT_PAD;
  const videoMaxH = vh - top - PIP_VIEWPORT_PAD - PIP_HEADER_PX;
  const byBottom = videoMaxH > 0 ? (videoMaxH * 16) / 9 : PIP_MIN_W;
  return Math.floor(Math.min(PIP_MAX_W, byRight, byBottom, vw - PIP_VIEWPORT_PAD * 2));
}

function clampArtifactPipLayout(layout: ArtifactPipLayout): ArtifactPipLayout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let width = Math.min(Math.max(layout.width, PIP_MIN_W), PIP_MAX_W);
  const maxW = maxPipVideoWidthForTopLeft(layout.left, layout.top);
  width = Math.min(width, Math.max(PIP_MIN_W, maxW));
  const totalH = pipTotalHeightPx(width);
  let left = layout.left;
  let top = layout.top;
  left = Math.min(Math.max(PIP_VIEWPORT_PAD, left), vw - width - PIP_VIEWPORT_PAD);
  top = Math.min(Math.max(PIP_VIEWPORT_PAD, top), vh - totalH - PIP_VIEWPORT_PAD);
  return { left, top, width };
}

function withYouTubeTimestamp(url: string | null | undefined, seconds: number) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("t", `${Math.max(0, Math.floor(seconds))}s`);
    return parsed.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}t=${Math.max(0, Math.floor(seconds))}s`;
  }
}

const SOURCE_STOPWORDS = new Set([
  "about", "after", "again", "against", "also", "because", "before", "being", "between", "claim",
  "could", "every", "from", "have", "into", "just", "like", "lord", "more", "much", "must",
  "that", "their", "there", "these", "they", "this", "through", "what", "when", "where", "which",
  "while", "with", "would", "your",
]);

function sourceTermsForClaim(claim: Claim) {
  const sourceText = [
    claim.claim,
    ...(claim.doctrine_tags ?? []),
    ...(claim.scripture_supports ?? []).flatMap((s) => [s.ref, s.note ?? ""]),
    ...(claim.scripture_challenges ?? []).flatMap((s) => [s.ref, s.note ?? ""]),
  ].join(" ");

  return Array.from(new Set(
    sourceText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 3 && !SOURCE_STOPWORDS.has(term)),
  ));
}

function findClaimSource(claim: Claim, segments: TranscriptSegment[]) {
  const terms = sourceTermsForClaim(claim);
  if (!terms.length) return null;

  let best: { segment: TranscriptSegment; score: number } | null = null;
  for (const segment of segments) {
    if (segment.isParagraphBreak || !segment.text.trim()) continue;
    const text = segment.text.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { segment, score };
  }

  if (!best || best.score < Math.min(2, terms.length)) return null;
  return best.segment;
}

interface MatchedBelief {
  id: string;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
}

interface Claim {
  id: string;
  claim: string;
  tone: string | null;
  doctrine_tags: string[];
  scripture_supports: { ref: string; note?: string }[];
  scripture_challenges: { ref: string; note?: string }[];
  match_relation: string | null;
  matched_belief_id: string | null;
  bias_flags: string[];
  verdict: string | null;
  user_note: string | null;
  /** Populated when claims were extracted per YouTube chapter (see `framework-analyze`). */
  chapter_start_seconds?: number | null;
}

type ClaimChapterGroup = {
  id: string;
  title: string;
  chapterStartSeconds?: number;
  claims: Claim[];
};

/** Group claims under YouTube chapters using persisted `chapter_start_seconds` when present, else transcript-time heuristics. */
function groupClaimsUnderYoutubeChapters(
  claims: Claim[],
  claimSources: Record<string, TranscriptSegment | null>,
  chapters: YoutubeChapter[],
): { grouped: boolean; groups: ClaimChapterGroup[] } {
  const sorted = [...chapters]
    .filter((c) => Number.isFinite(c.start_seconds))
    .sort((a, b) => a.start_seconds - b.start_seconds);
  if (!sorted.length) {
    return { grouped: false, groups: [{ id: "all", title: "", claims: [...claims] }] };
  }

  const before: Claim[] = [];
  const perChapter: Claim[][] = sorted.map(() => []);
  const uncategorized: Claim[] = [];

  for (const claim of claims) {
    const anchored = claim.chapter_start_seconds;
    if (anchored != null && Number.isFinite(anchored)) {
      if (anchored < sorted[0].start_seconds) {
        before.push(claim);
        continue;
      }
      let idx = 0;
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].start_seconds <= anchored) {
          idx = i;
          break;
        }
      }
      perChapter[idx].push(claim);
      continue;
    }

    const sec = claimSources[claim.id]?.startSeconds;
    if (sec == null || !Number.isFinite(sec)) {
      uncategorized.push(claim);
      continue;
    }
    if (sec < sorted[0].start_seconds) {
      before.push(claim);
      continue;
    }
    let idx = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].start_seconds <= sec) {
        idx = i;
        break;
      }
    }
    perChapter[idx].push(claim);
  }

  const groups: ClaimChapterGroup[] = [];
  if (before.length) {
    groups.push({ id: "before-first", title: "Before first chapter", claims: before });
  }
  sorted.forEach((ch, i) => {
    const list = perChapter[i];
    if (!list.length) return;
    groups.push({
      id: `ch-${ch.start_seconds}-${i}`,
      title: ch.title,
      chapterStartSeconds: ch.start_seconds,
      claims: list,
    });
  });
  if (uncategorized.length) {
    groups.push({ id: "uncategorized", title: "Uncategorized", claims: uncategorized });
  }

  return { grouped: true, groups };
}

function buildClaimResearchMarkdown(
  artifactTitle: string | null,
  claim: Claim,
  source: TranscriptSegment | null | undefined,
  belief: MatchedBelief | undefined,
): string {
  const lines: string[] = [];
  lines.push("## Artifact claim research");
  lines.push("");
  if (artifactTitle?.trim()) {
    lines.push(`**Artifact:** ${artifactTitle.trim()}`);
    lines.push("");
  }
  lines.push("## Claim");
  lines.push(claim.claim.trim());
  lines.push("");
  if (claim.verdict) {
    lines.push("## Verdict (so far)");
    lines.push(`- **${claim.verdict}**`);
    lines.push("");
  }
  if (claim.tone?.trim()) {
    lines.push("## Tone");
    lines.push(claim.tone.trim());
    lines.push("");
  }
  if (claim.doctrine_tags?.length) {
    lines.push("## Tags");
    for (const t of claim.doctrine_tags) lines.push(`- ${t}`);
    lines.push("");
  }
  if (claim.match_relation) {
    lines.push("## Relation to your framework");
    lines.push(claim.match_relation === "new" ? "New to your framework" : `You ${claim.match_relation}`);
    lines.push("");
  }
  if (claim.bias_flags?.length) {
    lines.push("## Flags");
    for (const f of claim.bias_flags) lines.push(`- ${f}`);
    lines.push("");
  }
  lines.push("## Source in transcript");
  if (source?.text?.trim()) {
    lines.push("> " + source.text.trim().replace(/\n/g, "\n> "));
  } else {
    lines.push("_No linked transcript snippet._");
  }
  lines.push("");
  if (belief) {
    lines.push("## Your belief context");
    lines.push(`**Statement:** ${belief.statement}`);
    if (belief.answer?.trim()) {
      lines.push("");
      lines.push(belief.answer.trim());
    }
    lines.push("");
    lines.push(`- Confidence: ${belief.confidence}%`);
    lines.push("");
  }
  const sup = claim.scripture_supports ?? [];
  const chal = claim.scripture_challenges ?? [];
  if (sup.length || chal.length) {
    lines.push("## Scripture");
    if (sup.length) {
      lines.push("### Supports");
      for (const s of sup) {
        lines.push(`- **${s.ref}**${s.note ? ` — ${s.note}` : ""}`);
      }
      lines.push("");
    }
    if (chal.length) {
      lines.push("### Challenges");
      for (const s of chal) {
        lines.push(`- **${s.ref}**${s.note ? ` — ${s.note}` : ""}`);
      }
      lines.push("");
    }
  }
  lines.push("---");
  lines.push("");
  lines.push("_Add your notes below._");
  lines.push("");
  return lines.join("\n");
}

function buildClaimResearchJournalTitle(artifactTitle: string | null, claim: Claim): string {
  const clip = claim.claim.trim().slice(0, 70);
  const suffix = claim.claim.trim().length > 70 ? "…" : "";
  const base = artifactTitle?.trim() || "Artifact";
  return `Claim research: ${clip}${suffix} (${base})`;
}

type ArtifactMomentKind = "bookmark" | "note" | "belief_seed";

interface ArtifactMoment {
  id: string;
  user_id: string;
  artifact_id: string;
  start_seconds: number;
  end_seconds: number | null;
  kind: ArtifactMomentKind;
  body: string | null;
  label: string | null;
  created_at: string;
}

export default function ArtifactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [a, setA] = useState<Artifact | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [matchedBeliefs, setMatchedBeliefs] = useState<Record<string, MatchedBelief>>({});
  const [polling, setPolling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef<number | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [savingPaste, setSavingPaste] = useState(false);
  const [formattingTranscript, setFormattingTranscript] = useState(false);
  const [videoStartSeconds, setVideoStartSeconds] = useState(0);
  const [liveMeta, setLiveMeta] = useState<ArtifactMetadata | null>(null);
  const [refreshingMeta, setRefreshingMeta] = useState(false);
  const [moments, setMoments] = useState<ArtifactMoment[]>([]);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [savingMoment, setSavingMoment] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerFailed, setPlayerFailed] = useState(false);
  const [playerState, setPlayerState] = useState("idle");
  const [quickBeliefOpen, setQuickBeliefOpen] = useState(false);
  const [quickBeliefText, setQuickBeliefText] = useState("");
  const [quickBeliefSource, setQuickBeliefSource] = useState("");
  const [wrapUpOpen, setWrapUpOpen] = useState(false);
  const youtubePlayerContainerRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const videoSlotRef = useRef<HTMLDivElement | null>(null);
  /** Left column scroll container on `lg` split layout; used as IntersectionObserver root for PIP. */
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const [pipMode, setPipMode] = useState(false);
  const [pipLayout, setPipLayout] = useState<ArtifactPipLayout | null>(null);
  const pipLayoutRef = useRef<ArtifactPipLayout | null>(null);
  pipLayoutRef.current = pipLayout;
  type PipPointerSession =
    | { kind: "drag"; pointerId: number; startX: number; startY: number; startL: number; startT: number; width: number }
    | { kind: "resize"; pointerId: number; startX: number; startY: number; startL: number; startT: number; startW: number };
  const pipPointerRef = useRef<PipPointerSession | null>(null);
  const transcriptRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const repairedRef = useRef(false);
  const lastBookmarkJournalInsertAtRef = useRef(0);
  const youtubeChapterSyncSessionRef = useRef<Set<string>>(new Set());
  const createProcessingToken = () => crypto.randomUUID();

  const fetchYouTubeMeta = useCallback(async (videoUrl: string): Promise<ArtifactMetadata | null> => {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`);
      if (!res.ok) return null;
      const json = (await res.json()) as {
        title?: string;
        author_name?: string;
        author_url?: string;
        thumbnail_url?: string;
        provider_name?: string;
      };
      return {
        source: "youtube",
        channel_title: json.author_name ?? null,
        channel_url: json.author_url ?? null,
        thumbnail_url: json.thumbnail_url ?? null,
        provider_name: json.provider_name ?? "YouTube",
        title: json.title ?? undefined,
      };
    } catch {
      return null;
    }
  }, []);

  const load = async () => {
    if (!id) return;
    const artWithMeta = await supabase
      .from("artifacts")
      .select("id,title,kind,status,error,raw_text,url,metadata")
      .eq("id", id)
      .maybeSingle();
    const artResult = artWithMeta.error
      ? await supabase
          .from("artifacts")
          .select("id,title,kind,status,error,raw_text,url")
          .eq("id", id)
          .maybeSingle()
      : artWithMeta;
    const { data: cl } = await supabase
      .from("artifact_claims")
      .select("*")
      .eq("artifact_id", id)
      .order("created_at");
    const { data: momentRows, error: momentError } = await supabase
      .from("artifact_moments")
      .select("id,user_id,artifact_id,start_seconds,end_seconds,kind,body,label,created_at")
      .eq("artifact_id", id)
      .order("start_seconds")
      .order("created_at");
    const art = artResult.data;
    const parsedClaims = ((cl as unknown) as Claim[]) ?? [];
    const beliefIds = Array.from(new Set(parsedClaims.map((c) => c.matched_belief_id).filter(Boolean))) as string[];
    let beliefMap: Record<string, MatchedBelief> = {};
    if (beliefIds.length > 0) {
      const { data: beliefs } = await supabase
        .from("belief_nodes")
        .select("id,topic,statement,answer,confidence")
        .in("id", beliefIds);
      beliefMap = (beliefs ?? []).reduce((acc, belief) => {
        acc[belief.id] = belief as MatchedBelief;
        return acc;
      }, {} as Record<string, MatchedBelief>);
    }
    setMatchedBeliefs(beliefMap);
    setA(art as Artifact | null);
    setClaims(parsedClaims);
    if (!momentError) setMoments(((momentRows as unknown) as ArtifactMoment[]) ?? []);
  };

  useEffect(() => {
    if (!user || !id) return;
    load();
  }, [user, id]);

  useEffect(() => {
    if (!a || a.kind !== "youtube" || !a.url) return;
    if (liveMeta || repairedRef.current) return;
    let cancelled = false;
    (async () => {
      const meta = await fetchYouTubeMeta(a.url!);
      if (cancelled || !meta) return;
      setLiveMeta(meta);

      const shouldFixTitle = !!meta.title && titleLooksBad(a.title) && a.title?.trim() !== meta.title.trim();
      const updatePatch: Record<string, unknown> = {};
      if (shouldFixTitle && meta.title) updatePatch.title = meta.title;

      const prev = (a.metadata ?? {}) as Record<string, unknown>;
      const dbMeta = {
        ...prev,
        source: "youtube",
        channel_title: meta.channel_title ?? null,
        channel_url: meta.channel_url ?? null,
        thumbnail_url: meta.thumbnail_url ?? null,
        provider_name: meta.provider_name ?? "YouTube",
      };

      const tryWithMetadata = await supabase
        .from("artifacts")
        .update({ ...updatePatch, metadata: dbMeta })
        .eq("id", a.id);
      if (tryWithMetadata.error && Object.keys(updatePatch).length > 0) {
        await supabase.from("artifacts").update(updatePatch as never).eq("id", a.id);
      }

      repairedRef.current = true;
      if (shouldFixTitle && meta.title) {
        setA((prev) => (prev ? { ...prev, title: meta.title ?? prev.title } : prev));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [a, fetchYouTubeMeta, liveMeta]);

  useEffect(() => {
    if (!a || a.kind !== "youtube" || !a.url || !user) return;
    if (a.status === "fetching" || a.status === "transcribing") return;
    const meta = (a.metadata ?? {}) as ArtifactMetadata;
    const existing = meta.youtube_chapters;
    if (Array.isArray(existing) && existing.length > 0) return;
    if (youtubeChapterSyncSessionRef.current.has(a.id)) return;
    youtubeChapterSyncSessionRef.current.add(a.id);
    let cancelled = false;
    (async () => {
      const { error } = await supabase.functions.invoke("framework-sync-youtube-chapters", {
        body: { artifact_id: a.id },
      });
      if (cancelled) return;
      if (error) {
        return;
      }
      await load();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.id, a?.kind, a?.url, a?.status, a?.metadata, user]);

  // Poll while any in-flight stage is running.
  const inFlight = !!a && ["fetching", "transcribing", "analyzing"].includes(a.status);
  useEffect(() => {
    if (!inFlight) {
      setPolling(false);
      startedRef.current = null;
      setElapsed(0);
      return;
    }
    setPolling(true);
    if (startedRef.current === null) startedRef.current = Date.now();
    const poll = setInterval(load, 2500);
    const tick = setInterval(() => {
      if (startedRef.current) setElapsed(Math.floor((Date.now() - startedRef.current) / 1000));
    }, 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFlight]);

  const displayTranscriptText = useMemo(
    () => (a?.raw_text ? normalizePastedTranscript(a.raw_text) : ""),
    [a?.raw_text],
  );
  const transcriptNeedsFormatting = useMemo(
    () => Boolean(a?.raw_text && needsTranscriptNormalization(a.raw_text)),
    [a?.raw_text],
  );
  const transcriptSplit = useMemo(() => splitTranscript(displayTranscriptText), [displayTranscriptText]);
  const transcriptSegments = transcriptSplit.segments;
  const transcriptTimedLayout = transcriptSplit.timed;
  const transcriptCoarseOnly = transcriptSplit.coarseTimestampsOnly;
  const claimSources = useMemo(() => {
    return claims.reduce((acc, claim) => {
      acc[claim.id] = findClaimSource(claim, transcriptSegments);
      return acc;
    }, {} as Record<string, TranscriptSegment | null>);
  }, [claims, transcriptSegments]);

  const { mergedVideoMeta, artifactMetadata, youtubeChaptersList } = useMemo(() => {
    const am = (a?.metadata ?? {}) as ArtifactMetadata;
    const merged = { ...am, ...(liveMeta ?? {}) } as ArtifactMetadata;
    return {
      artifactMetadata: am,
      mergedVideoMeta: merged,
      youtubeChaptersList: merged.youtube_chapters ?? [],
    };
  }, [a?.metadata, liveMeta]);

  const claimChapterLayout = useMemo(
    () => groupClaimsUnderYoutubeChapters(claims, claimSources, youtubeChaptersList),
    [claims, claimSources, youtubeChaptersList],
  );

  const youTubeVideoId = useMemo(() => (a?.kind === "youtube" ? getYouTubeVideoId(a.url) : null), [a?.kind, a?.url]);
  const embedUrl = useMemo(
    () => (a?.kind === "youtube" ? getYouTubeEmbed(a.url, videoStartSeconds) : null),
    [a?.kind, a?.url, videoStartSeconds],
  );

  useEffect(() => {
    if (!youTubeVideoId || !youtubePlayerContainerRef.current) {
      setPlayerReady(false);
      return;
    }

    let cancelled = false;
    setPlayerReady(false);
    setPlayerFailed(false);
    setPlayerState("loading");

    loadYouTubeIframeApi()
      .then(() => {
        if (cancelled || !youtubePlayerContainerRef.current || !window.YT?.Player) return;
        const player = new window.YT.Player(youtubePlayerContainerRef.current, {
          videoId: youTubeVideoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: videoStartSeconds > 0 ? 1 : 0,
            enablejsapi: 1,
            rel: 0,
            start: Math.max(0, Math.floor(videoStartSeconds)),
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              youtubePlayerRef.current = player;
              setPlayerReady(true);
              setPlayerState("ready");
            },
            onStateChange: (event) => setPlayerState(youTubeStateLabel(event.data)),
          },
        });
        youtubePlayerRef.current = player;
      })
      .catch(() => {
        if (cancelled) return;
        setPlayerFailed(true);
        setPlayerState("unavailable");
      });

    return () => {
      cancelled = true;
      setPlayerReady(false);
      const player = youtubePlayerRef.current;
      youtubePlayerRef.current = null;
      player?.destroy();
    };
    // Create the player once per video; seeking is handled imperatively.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youTubeVideoId]);

  useEffect(() => {
    if (!embedUrl) {
      setPipMode(false);
      return;
    }

    let io: IntersectionObserver | null = null;

    const attach = () => {
      const target = videoSlotRef.current;
      if (!target) return;
      io?.disconnect();
      const scrollRoot = mainScrollRef.current;
      const root =
        scrollRoot && window.matchMedia("(min-width: 1024px)").matches ? scrollRoot : null;
      io = new IntersectionObserver(
        ([entry]) => setPipMode(!entry.isIntersecting),
        { threshold: 0, root },
      );
      io.observe(target);
    };

    attach();
    const raf = window.requestAnimationFrame(attach);
    window.addEventListener("resize", attach);
    return () => {
      window.cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener("resize", attach);
    };
  }, [embedUrl]);

  useEffect(() => {
    if (!id) return;
    const saved = readPipLayoutFromSession(id);
    setPipLayout(saved ? clampArtifactPipLayout(saved) : null);
  }, [id]);

  useEffect(() => {
    if (!pipMode || !id) return;
    setPipLayout((prev) =>
      prev == null ? clampArtifactPipLayout(defaultArtifactPipLayout()) : clampArtifactPipLayout(prev),
    );
  }, [pipMode, id]);

  useEffect(() => {
    if (!pipMode || !id) return;
    const onResize = () => {
      setPipLayout((prev) => {
        const base = prev ?? defaultArtifactPipLayout();
        const next = clampArtifactPipLayout(base);
        writePipLayoutToSession(id, next);
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pipMode, id]);

  const onPipDragHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !id) return;
    const current = clampArtifactPipLayout(pipLayoutRef.current ?? defaultArtifactPipLayout());
    setPipLayout(current);
    writePipLayoutToSession(id, current);
    pipPointerRef.current = {
      kind: "drag",
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startL: current.left,
      startT: current.top,
      width: current.width,
    };
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [id]);

  const onPipDragHeaderPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = pipPointerRef.current;
    if (!s || s.kind !== "drag" || s.pointerId !== e.pointerId || !id) return;
    const next = clampArtifactPipLayout({
      left: s.startL + (e.clientX - s.startX),
      top: s.startT + (e.clientY - s.startY),
      width: s.width,
    });
    setPipLayout(next);
    writePipLayoutToSession(id, next);
  }, [id]);

  const onPipDragHeaderPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = pipPointerRef.current;
    if (s?.pointerId === e.pointerId) pipPointerRef.current = null;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  const onPipResizePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !id) return;
    e.stopPropagation();
    const current = clampArtifactPipLayout(pipLayoutRef.current ?? defaultArtifactPipLayout());
    setPipLayout(current);
    writePipLayoutToSession(id, current);
    pipPointerRef.current = {
      kind: "resize",
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startL: current.left,
      startT: current.top,
      startW: current.width,
    };
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [id]);

  const onPipResizePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const s = pipPointerRef.current;
    if (!s || s.kind !== "resize" || s.pointerId !== e.pointerId || !id) return;
    const dw = e.clientX - s.startX;
    const maxW = maxPipVideoWidthForTopLeft(s.startL, s.startT);
    const w = Math.min(Math.max(PIP_MIN_W, s.startW + dw), maxW);
    const next = clampArtifactPipLayout({ left: s.startL, top: s.startT, width: w });
    setPipLayout(next);
    writePipLayoutToSession(id, next);
  }, [id]);

  const onPipResizePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const s = pipPointerRef.current;
    if (s?.pointerId === e.pointerId) pipPointerRef.current = null;
    try {
      (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!a?.id) {
      useFloatingJournalStore.getState().setRouteArtifact(null);
      return;
    }
    useFloatingJournalStore.getState().setRouteArtifact({
      id: a.id,
      title: a.title || "Untitled artifact",
      kind: a.kind,
    });
    return () => {
      useFloatingJournalStore.getState().setRouteArtifact(null);
    };
  }, [a?.id, a?.title, a?.kind]);

  const canCapturePlaybackForJournal = Boolean(
    embedUrl && playerReady && !playerFailed && a?.kind === "youtube",
  );

  useEffect(() => {
    if (!a || a.kind !== "youtube") {
      floatingJournalPlaybackRef.current = null;
      useFloatingJournalStore.getState().setPlaybackCaptureAvailable(false);
      return;
    }
    floatingJournalPlaybackRef.current = () => {
      const current = youtubePlayerRef.current?.getCurrentTime?.();
      if (typeof current === "number" && Number.isFinite(current)) return Math.max(0, Math.floor(current));
      return Math.max(0, Math.floor(videoStartSeconds));
    };
    useFloatingJournalStore.getState().setPlaybackCaptureAvailable(canCapturePlaybackForJournal);
    return () => {
      floatingJournalPlaybackRef.current = null;
      useFloatingJournalStore.getState().setPlaybackCaptureAvailable(false);
    };
  }, [a, a?.id, a?.kind, canCapturePlaybackForJournal, videoStartSeconds]);

  const pipChromeLayout = useMemo(() => {
    if (!pipMode) return null;
    return clampArtifactPipLayout(pipLayout ?? defaultArtifactPipLayout());
  }, [pipMode, pipLayout]);

  const normalizedPastePreview = useMemo(
    () => (pasteText.trim() ? normalizePastedTranscript(pasteText) : ""),
    [pasteText],
  );
  const pasteTimestampsNormalized =
    pasteText.trim().length > 0 && normalizedPastePreview !== pasteText.trim();

  const applyPasteNormalization = useCallback((raw: string) => {
    const normalized = normalizePastedTranscript(raw);
    if (normalized !== raw.trim()) {
      setPasteText(normalized);
      toast({
        title: "Transcript timestamps normalized",
        description: `${countTimedTranscriptLines(normalized)} timed lines in [M:SS] format.`,
      });
    }
    return normalized;
  }, []);

  const handlePasteTranscriptInput = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const chunk = e.clipboardData.getData("text/plain");
    if (!chunk || !looksLikeYoutubeShowTranscriptPaste(chunk)) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? pasteText.length;
    const end = el.selectionEnd ?? pasteText.length;
    const merged = pasteText.slice(0, start) + chunk + pasteText.slice(end);
    applyPasteNormalization(merged);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!a) {
    return (
      <FrameworkLayout
        title="Artifact"
        back="/framework/artifacts"
        contentClassName="max-w-none"
        headerContentClassName="max-w-none"
      >
        Loading…
      </FrameworkLayout>
    );
  }

  const setVerdict = async (cid: string, verdict: string) => {
    await supabase.from("artifact_claims").update({ verdict }).eq("id", cid);
    setClaims((cs) => cs.map((c) => (c.id === cid ? { ...c, verdict } : c)));
  };

  const reanalyze = async () => {
    const normalized = normalizePastedTranscript(a.raw_text);
    const persistNormalized = normalized !== a.raw_text.trim();
    const processingToken = createProcessingToken();
    await supabase
      .from("artifacts")
      .update({
        ...(persistNormalized ? { raw_text: normalized } : {}),
        status: "analyzing",
        error: null,
        processing_token: processingToken,
      })
      .eq("id", a.id);
    await supabase.from("artifact_claims").delete().eq("artifact_id", a.id);
    await supabase.from("entity_mentions").delete().eq("artifact_id", a.id);
    await supabase.from("teachings").delete().eq("artifact_id", a.id).eq("status", "proposed");
    setClaims([]);
    setA({ ...a, ...(persistNormalized ? { raw_text: normalized } : {}), status: "analyzing", error: null });
    if (persistNormalized) {
      toast({
        title: "Transcript timestamps normalized",
        description: "Re-analysis uses the fixed [M:SS] lines.",
      });
    }
    supabase.functions.invoke("framework-analyze", { body: { artifact_id: a.id, processing_token: processingToken } }).catch((e) => {
      console.error(e);
      toast({ title: "Could not start analysis", variant: "destructive" });
    });
  };

  const formatTranscript = async () => {
    if (!a.raw_text.trim() || !transcriptNeedsFormatting) return;
    const normalized = normalizePastedTranscript(a.raw_text);
    setFormattingTranscript(true);
    const { error } = await supabase.from("artifacts").update({ raw_text: normalized }).eq("id", a.id);
    setFormattingTranscript(false);
    if (error) {
      toast({ title: "Could not format transcript", description: error.message, variant: "destructive" });
      return;
    }
    setA({ ...a, raw_text: normalized });
    toast({
      title: "Transcript formatted",
      description: `${countTimedTranscriptLines(normalized)} timed lines in [M:SS] format.`,
    });
  };

  const retryFetch = async () => {
    if (!a.url) return;
    const processingToken = createProcessingToken();
    await supabase.from("artifacts").update({ status: "fetching", error: null, processing_token: processingToken }).eq("id", a.id);
    setA({ ...a, status: "fetching", error: null });
    supabase.functions
      .invoke("framework-fetch-transcript", { body: { artifact_id: a.id, url: a.url, processing_token: processingToken } })
      .catch((e) => console.error(e));
  };

  const submitPasted = async () => {
    if (!pasteText.trim()) return;
    const normalized = normalizePastedTranscript(pasteText);
    setSavingPaste(true);
    const processingToken = createProcessingToken();
    await supabase
      .from("artifacts")
      .update({ raw_text: normalized, status: "analyzing", error: null, processing_token: processingToken })
      .eq("id", a.id);
    await supabase.from("artifact_claims").delete().eq("artifact_id", a.id);
    await supabase.from("entity_mentions").delete().eq("artifact_id", a.id);
    await supabase.from("teachings").delete().eq("artifact_id", a.id).eq("status", "proposed");
    setClaims([]);
    setA({ ...a, raw_text: normalized, status: "analyzing", error: null });
    setPasteOpen(false);
    setSavingPaste(false);
    toast({ title: "Transcript saved", description: "Analysis started." });
    supabase.functions
      .invoke("framework-analyze", { body: { artifact_id: a.id, processing_token: processingToken } })
      .catch((e) => {
        console.error(e);
        toast({ title: "Could not start analysis", variant: "destructive" });
      });
  };

  const quickBeliefInfluence: BeliefInfluenceAttachment | null =
    a.kind === "youtube" && mergedVideoMeta.channel_title?.trim()
      ? {
          source_type: "podcast",
          label: mergedVideoMeta.channel_title.trim().slice(0, 200),
          artifact_id: a.id,
          metadata: {
            influence_origin: "youtube_belief_capture",
            ...(mergedVideoMeta.channel_url ? { channel_url: mergedVideoMeta.channel_url } : {}),
            ...(mergedVideoMeta.thumbnail_url ? { thumbnail_url: mergedVideoMeta.thumbnail_url } : {}),
            provider_name: mergedVideoMeta.provider_name ?? "YouTube",
            ...(a.title ? { artifact_title: a.title } : {}),
          } as Json,
        }
      : null;
  const claimsDigest = claims.map((c, i) => `${i + 1}. ${c.claim}`).join("\n");
  const canCaptureMoments = !!embedUrl && playerReady && !playerFailed;

  const copyTranscript = async () => {
    if (!displayTranscriptText) return;
    await navigator.clipboard.writeText(displayTranscriptText);
    toast({ title: "Transcript copied" });
  };

  const getCurrentPlaybackSeconds = () => {
    const current = youtubePlayerRef.current?.getCurrentTime?.();
    if (typeof current === "number" && Number.isFinite(current)) return Math.max(0, Math.floor(current));
    return Math.max(0, Math.floor(videoStartSeconds));
  };

  const scrollTranscriptToSeconds = (seconds: number) => {
    const source = transcriptSegments
      .filter((segment) => !segment.isParagraphBreak && segment.startSeconds != null && segment.startSeconds <= seconds)
      .sort((left, right) => (right.startSeconds ?? 0) - (left.startSeconds ?? 0))[0];
    if (source) transcriptRefs.current[source.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const seekVideoToSeconds = (seconds: number) => {
    const start = Math.max(0, Math.floor(seconds));
    setVideoStartSeconds(start);
    if (playerReady && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(start, true);
      youtubePlayerRef.current.playVideo?.();
    }
    scrollTranscriptToSeconds(start);
  };

  const saveMoment = async (
    kind: ArtifactMomentKind,
    values: {
      label?: string | null;
      body?: string | null;
      startSeconds?: number;
      toastDescription?: string | null;
    } = {},
  ) => {
    if (!user) return null;
    const startSeconds = values.startSeconds ?? getCurrentPlaybackSeconds();
    setSavingMoment(true);
    const payload = {
      user_id: user.id,
      artifact_id: a.id,
      start_seconds: startSeconds,
      kind,
      label: values.label?.trim() || null,
      body: values.body?.trim() || null,
    };
    const { data, error } = await supabase
      .from("artifact_moments")
      .insert(payload)
      .select("id,user_id,artifact_id,start_seconds,end_seconds,kind,body,label,created_at")
      .maybeSingle();
    setSavingMoment(false);
    if (error || !data) {
      toast({ title: "Could not save moment", description: error?.message, variant: "destructive" });
      return null;
    }
    const saved = (data as unknown) as ArtifactMoment;
    setMoments((current) => [...current, saved].sort((left, right) => left.start_seconds - right.start_seconds));
    const title = kind === "note" ? "Note saved" : kind === "belief_seed" ? "Belief moment saved" : "Moment bookmarked";
    const d = values.toastDescription?.trim();
    toast(d ? { title, description: d } : { title });
    return saved;
  };

  const openJournalFromArtifact = (startSeconds?: number) => {
    const qs = new URLSearchParams();
    if (a.title) qs.set("artifactTitle", encodeURIComponent(a.title));
    if (a.url) qs.set("artifactUrl", encodeURIComponent(startSeconds == null ? a.url : withYouTubeTimestamp(a.url, startSeconds)));
    if (displayTranscriptText) qs.set("artifactTranscript", encodeURIComponent(displayTranscriptText.slice(0, 12000)));
    if (claimsDigest) qs.set("artifactClaims", encodeURIComponent(claimsDigest.slice(0, 6000)));
    if (startSeconds != null) qs.set("artifactTime", String(Math.max(0, Math.floor(startSeconds))));
    navigate(`/journal/new?${qs.toString()}`);
  };

  const openJournalFromClaim = (claim: Claim, startSeconds?: number) => {
    const qs = new URLSearchParams();
    if (a.title) qs.set("artifactTitle", encodeURIComponent(`${a.title} — one claim`));
    if (a.url) qs.set("artifactUrl", encodeURIComponent(startSeconds == null ? a.url : withYouTubeTimestamp(a.url, startSeconds)));
    if (displayTranscriptText) qs.set("artifactTranscript", encodeURIComponent(displayTranscriptText.slice(0, 12000)));
    qs.set("artifactClaims", encodeURIComponent(`Focus on this claim:\n\n${claim.claim}`));
    if (startSeconds != null) qs.set("artifactTime", String(Math.max(0, Math.floor(startSeconds))));
    navigate(`/journal/new?${qs.toString()}`);
  };

  const startClaimResearchChat = (claim: Claim, source: TranscriptSegment | null | undefined) => {
    const belief = claim.matched_belief_id ? matchedBeliefs[claim.matched_belief_id] : undefined;
    const markdown = buildClaimResearchMarkdown(a.title, claim, source, belief);
    useFloatingJournalStore.getState().setFloatingClaimResearch({
      claimId: claim.id,
      artifactId: a.id,
      claimMarkdown: markdown,
      journalTitle: buildClaimResearchJournalTitle(a.title, claim),
      transcriptExcerpt: source?.text ? source.text.slice(0, 4000) : undefined,
      initialTab: "chat",
      claimPreview: claim.claim.trim().slice(0, 220) || "Claim",
      matchedBeliefId: claim.matched_belief_id,
      artifactTitle: a.title,
    });
    useFloatingJournalStore.getState().setPanelOpen(true);
  };

  const jumpToTranscriptSource = (segment: TranscriptSegment | null) => {
    if (!segment || segment.isParagraphBreak) return;
    transcriptRefs.current[segment.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (segment.startSeconds != null) seekVideoToSeconds(segment.startSeconds);
  };

  const bookmarkCurrentMoment = async () => {
    const t = getCurrentPlaybackSeconds();
    const t0 = Math.max(0, t - 10);
    const panelOpen = useFloatingJournalStore.getState().panelOpen;
    const routeId = useFloatingJournalStore.getState().routeArtifact?.id;
    const insertTarget = floatingJournalInsertRef.current;
    const journalTied =
      panelOpen && routeId === a.id && insertTarget?.artifactId === a.id && a.kind === "youtube";

    let toastDescription: string | null = null;
    if (journalTied) {
      const now = Date.now();
      if (now - lastBookmarkJournalInsertAtRef.current < 1000) {
        toastDescription = "Journal excerpt skipped (wait about a second between clips).";
      } else {
        const clock0 = formatTranscriptClock(t0);
        const clock1 = formatTranscriptClock(t);
        const lines = transcriptTimedLayout
          ? collectTranscriptTextOverlappingInclusiveRange(transcriptSegments, t0, t)
          : [];
        let body: string;
        if (lines.length) {
          body = lines.join("\n\n");
        } else if (displayTranscriptText.trim()) {
          if (transcriptTimedLayout) {
            body = `*(No timed lines overlapped ${clock0}–${clock1}.)*\n\n${displayTranscriptText.trim().slice(-700)}`;
          } else {
            body =
              "*(This transcript has no line-level timestamps, so the last ~10 seconds cannot be auto-selected.)*";
          }
        } else {
          body = "_Transcript not available yet._";
        }
        const block = `\n\n---\n\n#### Bookmark · ${clock0}–${clock1}\n_Transcript — last ~10s of playback (through ${clock1})_\n\n${body}\n\n`;
        insertTarget.append(block);
        lastBookmarkJournalInsertAtRef.current = now;
        toastDescription = "Last ~10s of transcript added to your open journal.";
      }
    }

    const saved = await saveMoment("bookmark", {
      label: bookmarkLabel,
      startSeconds: t,
      toastDescription,
    });
    if (saved) setBookmarkLabel("");
  };

  const addNoteAtCurrentMoment = async () => {
    const saved = await saveMoment("note", { body: noteBody });
    if (saved) setNoteBody("");
  };

  const believeCurrentMoment = async () => {
    const seconds = getCurrentPlaybackSeconds();
    const timestamp = formatTranscriptClock(seconds);
    const sourceUrl = withYouTubeTimestamp(a.url, seconds);
    const text = `I believe this from ${a.title || "this video"} at ${timestamp}:\n\n`;
    const source = sourceUrl || `${a.title || "YouTube artifact"} at ${timestamp}`;
    setQuickBeliefText(text);
    setQuickBeliefSource(source);
    setQuickBeliefOpen(true);
    await saveMoment("belief_seed", { label: "Belief seed", body: text, startSeconds: seconds });
  };

  const openStudyJournal = () => {
    useFloatingJournalStore.getState().setFloatingClaimResearch(null);
    useFloatingJournalStore.getState().setPanelOpen(true);
  };

  const renderClaimCard = (c: Claim, claimIndex: number) => {
    const source = claimSources[c.id];
    const cardTint =
      claimIndex % 5 === 0
        ? "border-sky-200/90 bg-sky-50/90 dark:border-sky-800/50 dark:bg-sky-950/35"
        : claimIndex % 5 === 1
          ? "border-violet-200/90 bg-violet-50/85 dark:border-violet-800/50 dark:bg-violet-950/35"
          : claimIndex % 5 === 2
            ? "border-emerald-200/85 bg-emerald-50/75 dark:border-emerald-800/45 dark:bg-emerald-950/30"
            : claimIndex % 5 === 3
              ? "border-amber-200/90 bg-amber-50/80 dark:border-amber-800/45 dark:bg-amber-950/28"
              : "border-rose-200/85 bg-rose-50/80 dark:border-rose-800/45 dark:bg-rose-950/28";
    return (
      <article
        key={c.id}
        className={cn(
          "rounded-xl border-2 p-4 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]",
          cardTint,
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="font-display text-base leading-snug flex-1">{c.claim}</p>
          {c.verdict && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-foreground text-background">
              {c.verdict}
            </span>
          )}
        </div>

        <div className="mb-3 rounded-md border border-border/70 bg-background/55 p-3 text-xs backdrop-blur-[2px] dark:bg-background/20">
          <div className="mb-1 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <Quote className="w-3 h-3" />
            Source in transcript
          </div>
          {source ? (
            <div className="space-y-2">
              <p className="font-serif text-sm leading-6 text-foreground line-clamp-3">
                {source.text}
              </p>
              <Button size="sm" variant="outline" onClick={() => jumpToTranscriptSource(source)}>
                {source.startSeconds != null ? `Play from ${source.label}` : `Jump to ${source.label}`}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No exact transcript section was detected for this older analysis. Re-analyze after the timestamped transcript update for stronger source links.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3 text-[10px] uppercase tracking-wider">
          {c.tone && (
            <span className="rounded border border-border/60 bg-background/70 px-2 py-0.5 text-muted-foreground">tone: {c.tone}</span>
          )}
          {c.doctrine_tags?.map((t) => (
            <span key={t} className="rounded border border-border/60 bg-background/70 px-2 py-0.5 text-muted-foreground">{t}</span>
          ))}
          {c.match_relation && (
            <span className={`px-2 py-0.5 rounded ${
              c.match_relation === "agree"
                ? "bg-emerald-100 text-emerald-900"
                : c.match_relation === "disagree"
                  ? "bg-red-100 text-red-900"
                  : "bg-amber-100 text-amber-900"
            }`}>
              {c.match_relation === "new" ? "new to your framework" : `you ${c.match_relation}`}
            </span>
          )}
          {c.bias_flags?.map((f) => (
            <span key={f} className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
              ⚠ {f}
            </span>
          ))}
        </div>

        {(c.matched_belief_id && matchedBeliefs[c.matched_belief_id]) && (
          <div className="mb-3 rounded-md border border-border/70 bg-background/55 p-3 text-xs space-y-2 backdrop-blur-[2px] dark:bg-background/20">
            <div className="uppercase tracking-wider text-muted-foreground">Your current belief context</div>
            <div>
              <p className="font-medium text-foreground">{matchedBeliefs[c.matched_belief_id].statement}</p>
              {matchedBeliefs[c.matched_belief_id].answer && (
                <p className="text-muted-foreground mt-1 line-clamp-3">{matchedBeliefs[c.matched_belief_id].answer}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-background border border-border">confidence {matchedBeliefs[c.matched_belief_id].confidence}%</span>
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <ArrowRight className="w-3 h-3" />
                {c.match_relation === "agree" ? "reinforces what you already believe" : c.match_relation === "disagree" ? "challenges your current belief" : "partly overlaps with your current belief"}
              </span>
            </div>
          </div>
        )}

        {(c.scripture_supports?.length ?? 0) + (c.scripture_challenges?.length ?? 0) > 0 && (
          <div className="grid sm:grid-cols-2 gap-3 mb-3 text-xs">
            <div>
              <div className="uppercase tracking-wider text-muted-foreground mb-1">Supports</div>
              <ul className="space-y-1">
                {c.scripture_supports?.map((s, i) => (
                  <li key={i}><span className="font-medium">{s.ref}</span>{s.note ? ` — ${s.note}` : ""}</li>
                )) || <li className="text-muted-foreground">—</li>}
              </ul>
            </div>
            <div>
              <div className="uppercase tracking-wider text-muted-foreground mb-1">Challenges</div>
              <ul className="space-y-1">
                {c.scripture_challenges?.map((s, i) => (
                  <li key={i}><span className="font-medium">{s.ref}</span>{s.note ? ` — ${s.note}` : ""}</li>
                )) || <li className="text-muted-foreground">—</li>}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => startClaimResearchChat(c, source)}
            title="Open the mini journal to research this claim on this page"
          >
            <MessageCircle className="mr-1 h-3.5 w-3.5" />
            Research with AI
          </Button>
          <Button size="sm" variant="outline" onClick={() => openJournalFromClaim(c, source?.startSeconds ?? undefined)}>
            <NotebookPen className="mr-1 h-3.5 w-3.5" />
            Reflect in journal
          </Button>
          <Button size="sm" variant={c.verdict === "keep" ? "default" : "outline"} onClick={() => setVerdict(c.id, "keep")}>Keep</Button>
          <Button size="sm" variant={c.verdict === "reject" ? "default" : "outline"} onClick={() => setVerdict(c.id, "reject")}>Reject</Button>
          <Button size="sm" variant={c.verdict === "updated" ? "default" : "outline"} onClick={() => setVerdict(c.id, "updated")}>Update my belief</Button>
        </div>
      </article>
    );
  };

  const stageLabel: Record<string, string> = {
    fetching: a.kind === "youtube" ? "Watching the video and transcribing it…" : "Fetching content…",
    transcribing: "Transcribing audio…",
    analyzing: "Reading the transcript and pulling out claims…",
  };
  const stageHint: Record<string, string> = {
    fetching: "Looking for the video's official caption track. This usually takes a few seconds.",
    transcribing: "Converting your audio to text. Usually 10–30 seconds.",
    analyzing: "Comparing claims against your framework. Usually 10–30 seconds.",
  };

  /** Approx. framework sticky header + main vertical padding for `lg` split-pane height. */
  const artifactSplitPaneHeightClass = "lg:h-[calc(100dvh-10rem)]";

  return (
    <FrameworkLayout
      title={a.title || "Untitled artifact"}
      back="/framework/artifacts"
      contentClassName="max-w-none"
      headerContentClassName="max-w-none"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="uppercase tracking-wider">{a.kind}</span>
        <span>·</span>
        <span className="uppercase tracking-wider flex items-center gap-1">
          {inFlight && <Loader2 className="w-3 h-3 animate-spin" />}
          {a.status}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {a.kind === "youtube" && (
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPasteOpen(true)}>
              <FileText className="w-3.5 h-3.5 mr-1" /> Paste transcript
            </Button>
          )},
          {a.kind === "youtube" && a.status === "ready" && (
            <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setWrapUpOpen(true)}>
              Wrap up
            </Button>
          )}
          {!inFlight && a.status !== "error" && (
            <Button size="sm" variant="ghost" onClick={reanalyze} className="h-7">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-analyze
            </Button>
          )}
        </div>
      </div>

      <div
        className={`lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-6 lg:min-h-0 ${artifactSplitPaneHeightClass}`}
      >
        <div ref={mainScrollRef} className="min-h-0 space-y-5 lg:col-span-8 lg:overflow-y-auto lg:pr-1">
      {a.kind === "youtube" && a.status === "ready" && (
        <nav
          aria-label="On this page"
          className="sticky top-0 z-[15] flex flex-wrap gap-1 rounded-lg border border-border bg-background/95 px-2 py-2 text-[11px] shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85"
        >
          {embedUrl ? (
            <a href="#video" className="rounded-md px-2 py-1 font-medium text-muted-foreground transition hover:bg-muted/80 hover:text-foreground">
              Video
            </a>
          ) : null}
          {a.url ? (
            <a href="#chapters" className="rounded-md px-2 py-1 font-medium text-muted-foreground transition hover:bg-muted/80 hover:text-foreground">
              Chapters
            </a>
          ) : null}
          {a.kind === "youtube" && youtubeChaptersList.length === 0 ? (
            <a
              href="#study-spine-teachings"
              className="rounded-md px-2 py-1 font-medium text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
            >
              Teachings
            </a>
          ) : null}
          {claims.length > 0 ? (
            <a href="#claims" className="rounded-md px-2 py-1 font-medium text-muted-foreground transition hover:bg-muted/80 hover:text-foreground">
              Claims
            </a>
          ) : null}
          {embedUrl ? (
            <a href="#capture" className="rounded-md px-2 py-1 font-medium text-muted-foreground transition hover:bg-muted/80 hover:text-foreground">
              Capture
            </a>
          ) : null}
        </nav>
      )}
      {a.kind === "youtube" && (() => {
        const meta: ArtifactMetadata = {
          ...(liveMeta ?? {}),
          ...Object.fromEntries(Object.entries(artifactMetadata).filter(([, v]) => v != null && v !== "")),
        };
        const thumb = meta.thumbnail_url || liveMeta?.thumbnail_url;
        const channel = meta.channel_title || liveMeta?.channel_title;
        const channelUrl = meta.channel_url || liveMeta?.channel_url;
        const provider = meta.provider_name || liveMeta?.provider_name || "YouTube";
        if (!thumb && !channel && !a.title) return null;
        return (
          <section className="mb-5 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              {thumb && (
                <img src={thumb} alt="" className="h-16 w-28 rounded object-cover bg-muted flex-none" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{provider}</div>
                <div className="font-medium truncate">{a.title || "Untitled video"}</div>
                {channel && (
                  <div className="text-sm text-muted-foreground truncate">
                    by {channelUrl ? (
                      <a href={channelUrl} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                        {channel}<ExternalLink className="w-3 h-3" />
                      </a>
                    ) : channel}
                  </div>
                )}
              </div>
              {a.url && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="self-start"
                  disabled={refreshingMeta}
                  onClick={async () => {
                    if (!a.url) return;
                    setRefreshingMeta(true);
                    repairedRef.current = false;
                    setLiveMeta(null);
                    const meta = await fetchYouTubeMeta(a.url);
                    if (meta) {
                      setLiveMeta(meta);
                      const patch: Record<string, unknown> = {};
                      if (meta.title) patch.title = meta.title;
                      const prev = (a.metadata ?? {}) as Record<string, unknown>;
                      const dbMeta = {
                        ...prev,
                        source: "youtube",
                        channel_title: meta.channel_title ?? null,
                        channel_url: meta.channel_url ?? null,
                        thumbnail_url: meta.thumbnail_url ?? null,
                        provider_name: meta.provider_name ?? "YouTube",
                      };
                      const tryWithMetadata = await supabase
                        .from("artifacts")
                        .update({ ...patch, metadata: dbMeta })
                        .eq("id", a.id);
                      if (tryWithMetadata.error && Object.keys(patch).length > 0) {
                        await supabase.from("artifacts").update(patch as never).eq("id", a.id);
                      }
                      if (meta.title) setA((prev) => (prev ? { ...prev, title: meta.title ?? prev.title } : prev));
                      toast({ title: "Video info refreshed" });
                    } else {
                      toast({ title: "Could not fetch video info", variant: "destructive" });
                    }
                    setRefreshingMeta(false);
                  }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshingMeta ? "animate-spin" : ""}`} /> Refresh
                </Button>
              )}
            </div>
          </section>
        );
      })()}

      {inFlight && (
        <div className="mb-5 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            {stageLabel[a.status] ?? "Working…"}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{elapsed}s</span>
          </div>
          <p className="text-xs text-muted-foreground">{stageHint[a.status]}</p>
          {a.status === "fetching" && elapsed > 90 && (
            <p className="text-xs text-amber-700 mt-2">
              Taking longer than expected. Long videos can take several minutes. You can also paste the transcript yourself.
            </p>
          )}
          {(a.status === "fetching" || a.status === "transcribing") && (
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}>
                <FileText className="w-3.5 h-3.5 mr-1" /> Paste transcript instead
              </Button>
            </div>
          )}
        </div>
      )}

      {a.error && a.status === "error" && (
        <div className="mb-4 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="mb-2">{a.error}</div>
          <div className="flex flex-wrap gap-2">
            {a.kind === "youtube" && a.url && (
              <Button size="sm" variant="outline" onClick={retryFetch}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Try fetch again
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}>
              <FileText className="w-3.5 h-3.5 mr-1" /> Paste transcript
            </Button>
          </div>
        </div>
      )}

      {embedUrl && (
        <section id="video" className="scroll-mt-24 mb-5 rounded-lg border border-border bg-card p-3 lg:mb-0">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Youtube className="w-4 h-4 text-red-600" /> Video
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {playerFailed ? "static embed" : playerReady ? playerState : "loading controls"}
              </span>
            </div>
            <div ref={videoSlotRef} className="relative aspect-video w-full">
              <div
                className={
                  pipMode && pipChromeLayout
                    ? "fixed z-[60] flex flex-col overflow-hidden rounded-xl bg-black shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/15 [&>iframe]:h-full [&>iframe]:w-full"
                    : "absolute inset-0 overflow-hidden rounded bg-muted [&>iframe]:h-full [&>iframe]:w-full"
                }
                style={
                  pipMode && pipChromeLayout
                    ? {
                        left: pipChromeLayout.left,
                        top: pipChromeLayout.top,
                        width: pipChromeLayout.width,
                        height: pipTotalHeightPx(pipChromeLayout.width),
                      }
                    : undefined
                }
              >
                {pipMode && (
                  <div
                    className="flex h-7 shrink-0 cursor-grab touch-none select-none items-center gap-1.5 bg-black/85 pl-2 pr-1 text-white/90 active:cursor-grabbing"
                    onPointerDown={onPipDragHeaderPointerDown}
                    onPointerMove={onPipDragHeaderPointerMove}
                    onPointerUp={onPipDragHeaderPointerUp}
                    onPointerCancel={onPipDragHeaderPointerUp}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                    <span className="flex-1 truncate text-[10px] font-medium uppercase tracking-wider text-white/75">
                      Drag to move
                    </span>
                    <button
                      type="button"
                      onClick={() => videoSlotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label="Restore video to original position"
                      className="shrink-0 rounded-full bg-black/70 p-1 text-white shadow hover:bg-black/90"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div
                  className={
                    pipMode && pipChromeLayout
                      ? "relative w-full shrink-0 bg-black [&>iframe]:h-full [&>iframe]:w-full"
                      : "h-full w-full"
                  }
                  style={
                    pipMode && pipChromeLayout
                      ? { height: (pipChromeLayout.width * 9) / 16 }
                      : undefined
                  }
                >
                  {playerFailed ? (
                    <iframe
                      title="YouTube video"
                      src={embedUrl}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <div ref={youtubePlayerContainerRef} className="h-full w-full" />
                  )}
                </div>
                {pipMode && (
                  <button
                    type="button"
                    aria-label="Resize video"
                    className="absolute bottom-0 right-0 z-[60] h-7 w-7 cursor-nwse-resize touch-none rounded-tl-md border border-white/20 bg-black/55 hover:bg-black/75"
                    onPointerDown={onPipResizePointerDown}
                    onPointerMove={onPipResizePointerMove}
                    onPointerUp={onPipResizePointerUp}
                    onPointerCancel={onPipResizePointerUp}
                  />
                )}
              </div>
              {pipMode && (
                <button
                  type="button"
                  onClick={() => videoSlotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="absolute inset-0 flex items-center justify-center rounded bg-muted/70 text-xs text-muted-foreground transition hover:bg-muted"
                >
                  <span className="rounded-full border bg-background/90 px-3 py-1 shadow">Tap to bring video back</span>
                </button>
              )}
            </div>
          </div>

          <div id="capture" className="scroll-mt-24 mt-4 rounded-lg border border-border bg-muted/20 p-3 lg:mt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div>
                <div className="text-sm font-medium">Capture while watching</div>
                <p className="text-xs text-muted-foreground">
                  Save bookmarks, notes, and belief seeds at the current playback time.
                </p>
              </div>
              {!canCaptureMoments && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {playerFailed ? "Player controls are blocked, so moment capture is disabled." : "Moment capture enables when the player is ready."}
                </span>
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={bookmarkLabel}
                    onChange={(event) => setBookmarkLabel(event.target.value)}
                    placeholder="Optional bookmark label"
                    disabled={!canCaptureMoments || savingMoment}
                  />
                  <Button onClick={bookmarkCurrentMoment} disabled={!canCaptureMoments || savingMoment}>
                    <Bookmark className="mr-1 h-3.5 w-3.5" /> Bookmark
                  </Button>
                </div>
                <div className="space-y-2">
                  <PolishedTextarea
                    polishResetKey={a.id}
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    rows={3}
                    placeholder="Add a note at the current moment..."
                    disabled={!canCaptureMoments || savingMoment}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={addNoteAtCurrentMoment}
                      disabled={!canCaptureMoments || savingMoment || !noteBody.trim()}
                    >
                      <StickyNote className="mr-1 h-3.5 w-3.5" /> Save note
                    </Button>
                    <Button variant="outline" onClick={believeCurrentMoment} disabled={!canCaptureMoments || savingMoment}>
                      <Sparkles className="mr-1 h-3.5 w-3.5" /> I believe this
                    </Button>
                    <Button
                      onClick={openStudyJournal}
                      title="Floating study journal on this page (timestamp inserts when the player is ready)"
                    >
                      <NotebookPen className="mr-1 h-3.5 w-3.5" /> Study journal
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-muted-foreground">
                          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
                          More
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[min(100vw-2rem,18rem)]">
                        <DropdownMenuItem
                          disabled={!canCaptureMoments}
                          onClick={() => openJournalFromArtifact(getCurrentPlaybackSeconds())}
                        >
                          Open full-page journal with timestamp
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openJournalFromArtifact()} disabled={!a.raw_text?.trim()}>
                          Open full-page journal (full video)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border bg-background/70 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Saved moments
                </div>
                {moments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No moments saved yet.</p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-auto pr-1">
                    {moments.map((moment) => (
                      <button
                        key={moment.id}
                        type="button"
                        onClick={() => seekVideoToSeconds(moment.start_seconds)}
                        disabled={!canCaptureMoments}
                        className="w-full rounded-md border border-border bg-card p-2 text-left text-sm transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{formatTranscriptClock(moment.start_seconds)}</span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{moment.kind.replace("_", " ")}</span>
                        </div>
                        <div className="mt-1 font-medium">{moment.label || moment.body || "Untitled moment"}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {a.kind === "youtube" && a.url && (
        <section id="chapters" className="scroll-mt-24 mb-5 rounded-lg border border-border bg-card p-4">
          {a.status === "ready" && (
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Chapters</span> come from timestamp lines in the creator&apos;s description (same source YouTube uses). They help you jump; they are not generated by our AI.
            </p>
          )}
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <LayoutList className="h-4 w-4 text-muted-foreground" aria-hidden />
            Chapters
            {youtubeChaptersList.length > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">
                {youtubeChaptersList.length} section{youtubeChaptersList.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {youtubeChaptersList.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {youtubeChaptersList.map((chapter, idx) => (
                <button
                  key={`${chapter.start_seconds}-${idx}`}
                  type="button"
                  onClick={() => seekVideoToSeconds(chapter.start_seconds)}
                  className="rounded-lg border border-border bg-muted/15 p-3 text-left text-sm transition hover:border-foreground/40 hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-snug">{chapter.title}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                      {formatTranscriptClock(chapter.start_seconds)}
                    </span>
                  </div>
                  <span className="mt-2 inline-flex items-center text-xs text-muted-foreground">
                    Jump to this point <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          ) : a.status === "ready" ? (
            <p className="text-xs text-muted-foreground">No chapters detected in the video description.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Chapters appear when the video description includes timestamps.</p>
          )}
        </section>
      )}

      {a.kind === "youtube" && a.status === "ready" && youtubeChaptersList.length === 0 && (
        <section id="study-spine-teachings" className="scroll-mt-24 mb-5 rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            Study spine: Teachings
          </div>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            This video has no description chapters, so we lean on extracted <span className="font-medium text-foreground">teachings</span> (what the speaker invites you toward) alongside claims. Use{" "}
            <a href="#capture" className="font-medium text-foreground underline-offset-2 hover:underline">
              Capture
            </a>{" "}
            for bookmarks and notes while you watch, and open the{" "}
            <span className="font-medium text-foreground">Study journal</span> in the transcript column to reflect in depth.
          </p>
          <TeachingsPanel artifactId={a.id} artifactStatus={a.status} />
        </section>
      )}

      {a.status === "ready" && <ArtifactEntitiesPanel artifactId={a.id} artifactStatus={a.status} />}

      {a.status === "ready" && !(a.kind === "youtube" && youtubeChaptersList.length === 0) && (
        <TeachingsPanel artifactId={a.id} artifactStatus={a.status} />
      )}

      {a.status === "ready" && claims.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-muted/25 p-3 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Claims</p>
          <p className="mt-1">
            Each card is one thesis-sized line from the transcript, checked against your framework — a hypothesis to verify, not preaching.
            {a.kind === "youtube" && youtubeChaptersList.length > 0 && claimChapterLayout.grouped ? (
              <span className="mt-2 block">
                With description chapters available, cards are grouped under the chapter they were extracted with (or the chapter implied by the linked transcript time). Cards without a chapter anchor or timed transcript link land in{" "}
                <span className="font-medium text-foreground">Uncategorized</span> at the end.
              </span>
            ) : a.kind === "youtube" && youtubeChaptersList.length > 0 ? (
              <span className="mt-2 block">
                Chapters above follow the creator&apos;s outline; claims stay in list order when a card has no timed transcript link.
              </span>
            ) : null}
          </p>
        </div>
      )}

      {a.status === "ready" && claims.length === 0 && !a.error && (
        <div className="mb-4 rounded border border-border bg-muted/30 p-3 text-sm">
          The transcript came through but no clear claims were extracted. Try Re-analyze, or paste a different excerpt.
        </div>
      )}

      <Dialog
        open={pasteOpen}
        onOpenChange={(open) => {
          setPasteOpen(open);
          if (!open) setPasteText("");
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Paste full transcript</DialogTitle>
            <DialogDescription>
              Copy the entire transcript from YouTube (⋮ → Show transcript, select all) or any transcript tool, then paste below.
              We will save it and run the analyzer.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onPaste={handlePasteTranscriptInput}
            rows={18}
            placeholder={"[0:00] Opening line…\n[0:15] Next phrase…\n\nPlain text without timestamps also works."}
            className="font-mono text-sm resize-y min-h-[280px] flex-1"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground tabular-nums">
            {pasteText.length.toLocaleString()} characters
            {pasteText.trim() ? ` · ~${pasteText.trim().split(/\s+/).length.toLocaleString()} words` : ""}
            {pasteTimestampsNormalized ? (
              <span className="text-foreground">
                {" "}
                · Timestamps will normalize to [M:SS] ({countTimedTranscriptLines(normalizedPastePreview)} lines)
              </span>
            ) : null}
          </p>
          {pasteTimestampsNormalized ? (
            <pre className="max-h-24 overflow-auto rounded border border-border bg-muted/40 p-2 font-mono text-[11px] leading-snug text-muted-foreground">
              {normalizedPastePreview.slice(0, 500)}
              {normalizedPastePreview.length > 500 ? "…" : ""}
            </pre>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setPasteOpen(false)} disabled={savingPaste}>
              Cancel
            </Button>
            <Button onClick={submitPasted} disabled={savingPaste || !pasteText.trim()}>
              {savingPaste ? "Saving…" : "Save & analyze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {displayTranscriptText && a.status !== "ready" && (
        <details className="mb-5 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Transcript captured ({displayTranscriptText.length.toLocaleString()} chars)
            {transcriptNeedsFormatting ? " · stored copy still needs Format transcript to persist fixes" : ""}
          </summary>
          <pre className="mt-2 whitespace-pre-wrap font-serif text-sm bg-muted/30 p-3 rounded max-h-64 overflow-auto">
            {displayTranscriptText.slice(0, 4000)}
            {displayTranscriptText.length > 4000 ? "…" : ""}
          </pre>
        </details>
      )}

      {a.status === "ready" && claims.length > 0 && (
        <div id="claims" className="scroll-mt-24 max-w-4xl space-y-8">
          {claimChapterLayout.grouped ? (
            claimChapterLayout.groups.map((group) => (
              <div key={group.id} className="space-y-3">
                <div className="sticky top-0 z-[5] -mx-1 mb-1 flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 font-medium text-sm text-foreground">
                  <span className="min-w-0 leading-snug">{group.title}</span>
                  {group.chapterStartSeconds != null ? (
                    <span className="shrink-0 font-mono text-xs font-normal tabular-nums text-muted-foreground">
                      {formatTranscriptClock(group.chapterStartSeconds)}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-5">
                  {group.claims.map((c) => renderClaimCard(c, Math.max(0, claims.findIndex((x) => x.id === c.id))))}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-5">
              {claims.map((c, i) => renderClaimCard(c, i))}
            </div>
          )}
        </div>
      )}
        </div>

        <aside
          className="mt-8 min-h-0 lg:col-span-4 lg:mt-0 lg:flex lg:h-full lg:flex-col lg:overflow-hidden lg:pl-0.5"
          aria-label="Transcript"
        >
          {a.raw_text && (
            <TranscriptPanel
              segments={transcriptSegments}
              timed={transcriptTimedLayout}
              coarseTimestampsOnly={transcriptCoarseOnly}
              embedAvailable={Boolean(embedUrl) && !playerFailed}
              playerReady={playerReady}
              getPlaybackSeconds={getCurrentPlaybackSeconds}
              onSeek={seekVideoToSeconds}
              onCopy={copyTranscript}
              onJournal={() => openJournalFromArtifact()}
              fullPageJournalLabel="Full-page journal"
              onRetryFetch={a.kind === "youtube" && a.url ? retryFetch : undefined}
              retryDisabled={inFlight}
              setSegmentRef={(id, el) => {
                transcriptRefs.current[id] = el;
              }}
              extraHeaderActions={
                <>
                  {transcriptNeedsFormatting ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-9 shrink-0"
                      onClick={formatTranscript}
                      disabled={formattingTranscript || inFlight}
                      title="Rewrite mashed YouTube timestamps in [M:SS] form and save to this artifact"
                    >
                      {formattingTranscript ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" aria-hidden />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 sm:mr-1" aria-hidden />
                      )}
                      <span className="hidden sm:inline">
                        {formattingTranscript ? "Formatting…" : "Format transcript"}
                      </span>
                      <span className="sm:hidden">{formattingTranscript ? "…" : "Format"}</span>
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={openStudyJournal}
                    title="Floating study journal on this page"
                    aria-label="Open study journal"
                  >
                    <NotebookPen className="h-3.5 w-3.5 sm:mr-1" aria-hidden />
                    <span className="hidden sm:inline">Study journal</span>
                  </Button>
                </>
              }
            />
          )}
        </aside>
      </div>

      {polling && (
        <p className="mt-6 text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Watching for new claims…
        </p>
      )}

      <Dialog open={wrapUpOpen} onOpenChange={setWrapUpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wrap up studying?</DialogTitle>
            <DialogDescription>
              A quick checkpoint — nothing is saved automatically here; use it to close the loop in your head.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/80" aria-hidden />
              <span>Reviewed claim cards (Keep / Reject / Update) where it helped</span>
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/80" aria-hidden />
              <span>Saved bookmarks or notes in Capture, if you wanted a paper trail</span>
            </li>
          </ul>
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                setWrapUpOpen(false);
                toast({ title: "Nice work", description: "Heading back to your artifacts." });
                navigate("/framework/artifacts");
              }}
            >
              Back to artifacts
            </Button>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setWrapUpOpen(false)}>
                Stay here
              </Button>
              {claims.length > 0 ? (
                <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
                  <Link to="/framework/graph" onClick={() => setWrapUpOpen(false)}>
                    Open belief graph
                  </Link>
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickBeliefDialog
        open={quickBeliefOpen}
        onOpenChange={setQuickBeliefOpen}
        initialText={quickBeliefText}
        initialSource={quickBeliefSource}
        influenceAttachment={quickBeliefInfluence}
      />

    </FrameworkLayout>
  );
}
