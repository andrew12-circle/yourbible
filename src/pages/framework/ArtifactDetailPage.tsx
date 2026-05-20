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
  MessageCircle,
  LayoutList,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  ListOrdered,
  Check,
  X,
  Pencil,
  CirclePause,
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
import ClaimsGlossary, { type ClaimsGlossaryEntry } from "@/components/framework/ClaimsGlossary";
import ClaimEpistemologyPanel from "@/components/framework/ClaimEpistemologyPanel";
import ClaimScriptureRef from "@/components/framework/ClaimScriptureRef";
import ClaimIconActionButton from "@/components/framework/ClaimIconActionButton";
import ArtifactYoutubePipOverlay from "@/components/framework/ArtifactYoutubePipOverlay";
import { useArtifactYoutubePip } from "@/hooks/useArtifactYoutubePip";
import { parseClaimEpistemology, type ClaimEpistemology } from "@/lib/framework/epistemology";
import {
  formatClaimVerdict,
  isDeferredVerdict,
  type ClaimVerdict,
} from "@/lib/framework/claimVerdict";
import {
  countTimedTranscriptLines,
  looksLikeYoutubeShowTranscriptPaste,
  cleanTranscriptQuoteForDisplay,
  needsTranscriptNormalization,
  normalizePastedTranscript,
} from "@/lib/normalizePastedTranscript";
import {
  collectTranscriptTextOverlappingInclusiveRange,
  formatClaimSourceClock,
  formatTranscriptClock,
  splitTranscript,
  type TranscriptSegment,
} from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";
import type { YoutubeChapter } from "@/lib/youtubeChapters";
import { getYouTubeVideoId } from "@/lib/youtube";

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
  youtube_chapters_source?: string | null;
  video_id?: string;
}

function formatArtifactKind(kind: string): string {
  if (kind === "youtube") return "YouTube";
  return kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatArtifactStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function titleLooksBad(title: string | null | undefined): boolean {
  if (!title) return true;
  const t = title.trim();
  if (!t) return true;
  if (t.length <= 5 && /^\d+(?:\.\d+)?[KMB]?$/i.test(t)) return true;
  if (/^\d+(?:\.\d+)?[KMB]?\s+(views?|subscribers?)\b/i.test(t)) return true;
  return false;
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
  deferred_at: string | null;
  user_note: string | null;
  /** Populated when claims were extracted per YouTube chapter (see `framework-analyze`). */
  chapter_start_seconds?: number | null;
  /** AI epistemology layers (empty until re-analyze). */
  epistemology?: ClaimEpistemology | null;
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
    const clock = formatClaimSourceClock(source.startSeconds, source.label);
    const quote = cleanTranscriptQuoteForDisplay(source.text);
    if (clock) lines.push(`**[${clock}]**`);
    lines.push("> " + (quote || source.text.trim()).replace(/\n/g, "\n> "));
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
  const [quickBeliefOpen, setQuickBeliefOpen] = useState(false);
  const [quickBeliefText, setQuickBeliefText] = useState("");
  const [quickBeliefSource, setQuickBeliefSource] = useState("");
  const [wrapUpOpen, setWrapUpOpen] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const transcriptRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const repairedRef = useRef(false);
  const lastBookmarkJournalInsertAtRef = useRef(0);
  const youtubeChapterSyncSessionRef = useRef<Set<string>>(new Set());
  const youtubeChapterGenSessionRef = useRef<Set<string>>(new Set());
  const [generatingChapters, setGeneratingChapters] = useState(false);
  const [pageSectionHash, setPageSectionHash] = useState(() =>
    typeof window !== "undefined" ? window.location.hash : "",
  );
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
    const parsedClaims = (((cl as unknown) as Claim[]) ?? []).map((row) => ({
      ...row,
      epistemology: parseClaimEpistemology(
        (row as Claim & { epistemology?: unknown }).epistemology,
      ),
    }));
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

  const patchArtifactMetadata = useCallback(async (artifactId: string) => {
    const { data } = await supabase
      .from("artifacts")
      .select("metadata,title")
      .eq("id", artifactId)
      .maybeSingle();
    if (!data) return;
    setA((prev) =>
      prev
        ? {
            ...prev,
            metadata: (data.metadata as ArtifactMetadata | null) ?? prev.metadata,
            title: data.title ?? prev.title,
          }
        : prev,
    );
  }, []);

  useEffect(() => {
    if (!user || !id) return;
    load();
  }, [user, id]);

  useEffect(() => {
    const sync = () => setPageSectionHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

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
  }, [a?.id, a?.kind, a?.url, a?.title, fetchYouTubeMeta, liveMeta]);

  const youtubeChapterCount = useMemo(() => {
    const ch = (a?.metadata as ArtifactMetadata | undefined)?.youtube_chapters;
    return Array.isArray(ch) ? ch.length : 0;
  }, [a?.metadata]);

  useEffect(() => {
    if (!a || a.kind !== "youtube" || !a.url || !user) return;
    if (a.status === "fetching" || a.status === "transcribing") return;
    if (youtubeChapterCount > 0) return;
    if (youtubeChapterSyncSessionRef.current.has(a.id)) return;
    youtubeChapterSyncSessionRef.current.add(a.id);
    let cancelled = false;
    (async () => {
      const { error } = await supabase.functions.invoke("framework-sync-youtube-chapters", {
        body: { artifact_id: a.id },
      });
      if (cancelled || error) return;
      await patchArtifactMetadata(a.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [a?.id, a?.kind, a?.url, a?.status, patchArtifactMetadata, user, youtubeChapterCount]);

  useEffect(() => {
    if (!a || a.kind !== "youtube" || !user) return;
    if (a.status !== "ready") return;
    const text = a.raw_text?.trim() ?? "";
    if (text.length < 200) return;
    if (youtubeChapterCount > 0) return;
    if (youtubeChapterGenSessionRef.current.has(a.id)) return;
    youtubeChapterGenSessionRef.current.add(a.id);
    let cancelled = false;
    (async () => {
      setGeneratingChapters(true);
      try {
        const { error } = await supabase.functions.invoke("framework-generate-chapters", {
          body: { artifact_id: a.id },
        });
        if (cancelled || error) return;
        await patchArtifactMetadata(a.id);
      } catch {
        /* optional — user can tap Generate chapters */
      } finally {
        if (!cancelled) setGeneratingChapters(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [a?.id, a?.kind, a?.status, a?.raw_text, patchArtifactMetadata, user, youtubeChapterCount]);

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

  const { mergedVideoMeta, artifactMetadata, youtubeChaptersList, youtubeChaptersSource } = useMemo(() => {
    const am = (a?.metadata ?? {}) as ArtifactMetadata;
    const merged = { ...am, ...(liveMeta ?? {}) } as ArtifactMetadata;
    return {
      artifactMetadata: am,
      mergedVideoMeta: merged,
      youtubeChaptersList: merged.youtube_chapters ?? [],
      youtubeChaptersSource: merged.youtube_chapters_source ?? null,
    };
  }, [a?.metadata, liveMeta]);

  const youtubeChaptersSourceLabel = useMemo(() => {
    switch (youtubeChaptersSource) {
      case "youtube_data_api_v3":
      case "watch_player_response":
        return "From the creator's video description (same as YouTube).";
      case "transcript_ai":
        return "Generated from your transcript — major topic shifts outlined by AI.";
      case "transcript_heuristic":
        return "Generated from timed transcript — evenly spaced sections with opening lines as titles.";
      default:
        return null;
    }
  }, [youtubeChaptersSource]);

  const claimChapterLayout = useMemo(
    () => groupClaimsUnderYoutubeChapters(claims, claimSources, youtubeChaptersList),
    [claims, claimSources, youtubeChaptersList],
  );

  const youTubeVideoId = useMemo(() => {
    if (a?.kind !== "youtube") return null;
    const fromUrl = getYouTubeVideoId(a.url);
    if (fromUrl) return fromUrl;
    const fromMeta = artifactMetadata.video_id?.trim();
    return fromMeta || null;
  }, [a?.kind, a?.url, artifactMetadata.video_id]);

  const embedSrc = useMemo(() => {
    if (!youTubeVideoId) return null;
    const start = Math.max(0, Math.floor(videoStartSeconds));
    if (start > 0) return `https://www.youtube.com/embed/${youTubeVideoId}?start=${start}`;
    return `https://www.youtube.com/embed/${youTubeVideoId}`;
  }, [youTubeVideoId, videoStartSeconds]);

  const youtubePip = useArtifactYoutubePip({
    artifactId: id,
    enabled: Boolean(embedSrc && youTubeVideoId),
    mainScrollRef,
  });

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

  const canCapturePlaybackForJournal = Boolean(youTubeVideoId && a?.kind === "youtube");

  useEffect(() => {
    if (!a || a.kind !== "youtube") {
      floatingJournalPlaybackRef.current = null;
      useFloatingJournalStore.getState().setPlaybackCaptureAvailable(false);
      return;
    }
    floatingJournalPlaybackRef.current = () => Math.max(0, Math.floor(videoStartSeconds));
    useFloatingJournalStore.getState().setPlaybackCaptureAvailable(canCapturePlaybackForJournal);
    return () => {
      floatingJournalPlaybackRef.current = null;
      useFloatingJournalStore.getState().setPlaybackCaptureAvailable(false);
    };
  }, [a, a?.id, a?.kind, canCapturePlaybackForJournal, videoStartSeconds]);

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

  const glossaryEntries: ClaimsGlossaryEntry[] = useMemo(
    () =>
      claims.map((c, i) => ({
        id: c.id,
        claim: c.claim,
        verdict: c.verdict,
        number: i + 1,
      })),
    [claims],
  );

  const deferredOnArtifact = useMemo(
    () => claims.filter((c) => isDeferredVerdict(c.verdict)).length,
    [claims],
  );

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || !claims.some((c) => c.id === hash)) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => window.clearTimeout(t);
  }, [claims, a?.status]);

  const scrollToVideoSection = useCallback(() => {
    document.getElementById("video")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (loading) {
    return (
      <FrameworkLayout
        title="Artifact"
        back="/framework/artifacts"
        contentClassName="max-w-none"
        headerContentClassName="max-w-none"
      >
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading artifact…
        </div>
      </FrameworkLayout>
    );
  }
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

  const setVerdict = async (cid: string, verdict: ClaimVerdict | null) => {
    const deferred_at = verdict === "defer" ? new Date().toISOString() : null;
    const patch = { verdict, deferred_at };
    await supabase.from("artifact_claims").update(patch).eq("id", cid);
    setClaims((cs) =>
      cs.map((c) => (c.id === cid ? { ...c, verdict, deferred_at } : c)),
    );
  };

  const toggleResearchLater = async (cid: string, currentVerdict: string | null) => {
    if (isDeferredVerdict(currentVerdict)) {
      await setVerdict(cid, null);
      toast({ title: "Removed from research queue" });
    } else {
      await setVerdict(cid, "defer");
      toast({ title: "Saved for later", description: "Find it under Framework → Research later." });
    }
  };

  const jumpToClaim = (claimNumber: number) => {
    const el = document.querySelector(`[data-claim-number="${claimNumber}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const generateChaptersFromTranscript = async (force = false) => {
    if (!a || a.kind !== "youtube") return;
    setGeneratingChapters(true);
    try {
      const { data, error } = await supabase.functions.invoke("framework-generate-chapters", {
        body: { artifact_id: a.id, force },
      });
      if (error) throw error;
      const payload = data as { error?: string; skipped?: boolean; count?: number } | null;
      if (payload?.error) throw new Error(payload.error);
      await patchArtifactMetadata(a.id);
      if (payload?.skipped) {
        toast({ title: "Chapters already present" });
      } else {
        toast({
          title: "Chapters generated",
          description:
            payload?.count != null
              ? `${payload.count} sections — Re-analyze to extract claims per chapter.`
              : "Re-analyze to extract claims per chapter.",
        });
      }
    } catch {
      toast({ title: "Could not generate chapters", variant: "destructive" });
    } finally {
      setGeneratingChapters(false);
    }
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
  const canCaptureMoments = Boolean(youTubeVideoId);

  const copyTranscript = async () => {
    if (!displayTranscriptText) return;
    await navigator.clipboard.writeText(displayTranscriptText);
    toast({ title: "Transcript copied" });
  };

  const getCurrentPlaybackSeconds = () => Math.max(0, Math.floor(videoStartSeconds));

  const scrollTranscriptToSeconds = (seconds: number) => {
    const source = transcriptSegments
      .filter((segment) => !segment.isParagraphBreak && segment.startSeconds != null && segment.startSeconds <= seconds)
      .sort((left, right) => (right.startSeconds ?? 0) - (left.startSeconds ?? 0))[0];
    if (source) transcriptRefs.current[source.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const seekVideoToSeconds = (seconds: number) => {
    const start = Math.max(0, Math.floor(seconds));
    setVideoStartSeconds(start);
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
    const sourceClock = source ? formatClaimSourceClock(source.startSeconds, source.label) : null;
    const sourceQuote = source ? cleanTranscriptQuoteForDisplay(source.text) : "";
    const epistemology = parseClaimEpistemology(c.epistemology);
    const claimNumber = claimIndex + 1;
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
        id={c.id}
        data-claim-number={claimNumber}
        className={cn(
          "scroll-mt-28 space-y-4 rounded-xl border-2 p-4 shadow-sm ring-1 ring-black/[0.03] sm:p-5 dark:ring-white/[0.04]",
          cardTint,
          isDeferredVerdict(c.verdict) && "ring-2 ring-amber-400/50 dark:ring-amber-600/40",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              className="shrink-0 font-mono text-sm font-semibold tabular-nums text-muted-foreground"
              aria-label={`Claim ${claimNumber}`}
            >
              #{claimNumber}
            </span>
            <p className="font-display text-base leading-relaxed text-foreground">{c.claim}</p>
          </div>
          {c.verdict ? (
            <span
              className={cn(
                "shrink-0 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded",
                isDeferredVerdict(c.verdict)
                  ? "bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100"
                  : "bg-foreground text-background",
              )}
            >
              {formatClaimVerdict(c.verdict)}
            </span>
          ) : null}
        </div>

        <div className="rounded-lg border border-border/70 bg-background/55 p-3.5 text-xs backdrop-blur-[2px] sm:p-4 dark:bg-background/20">
          <div className="mb-2.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Quote className="h-3 w-3 shrink-0" />
            Source in transcript
          </div>
          {source ? (
            <div className="space-y-3">
              {sourceClock ? (
                <p className="font-mono text-sm font-medium tabular-nums tracking-tight text-foreground/90">
                  [{sourceClock}]
                </p>
              ) : null}
              {sourceQuote ? (
                <p className="font-sans text-sm leading-relaxed text-foreground line-clamp-4">
                  {sourceQuote}
                </p>
              ) : (
                <p className="font-sans text-sm leading-relaxed italic text-muted-foreground">
                  Transcript excerpt unavailable.
                </p>
              )}
              <Button size="sm" variant="outline" className="mt-0.5" onClick={() => jumpToTranscriptSource(source)}>
                {sourceClock && source.startSeconds != null
                  ? `Play from ${sourceClock}`
                  : source.label
                    ? `Jump to ${formatClaimSourceClock(null, source.label) ?? source.label}`
                    : "Jump to transcript"}
              </Button>
            </div>
          ) : (
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
              No exact transcript section was detected for this older analysis. Re-analyze after the timestamped transcript update for stronger source links.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
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
          <div className="rounded-lg border border-border/70 bg-background/55 p-3.5 text-xs space-y-2.5 backdrop-blur-[2px] sm:p-4 dark:bg-background/20">
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

        <ClaimEpistemologyPanel epistemology={epistemology} className="mb-0" />

        {(c.scripture_supports?.length ?? 0) + (c.scripture_challenges?.length ?? 0) > 0 && (
          <div className="grid gap-4 text-xs sm:grid-cols-2 sm:gap-3">
            <div className="space-y-2">
              <div className="uppercase tracking-wider text-muted-foreground">Supports</div>
              <ul className="space-y-2">
                {c.scripture_supports?.length ? (
                  c.scripture_supports.map((s, i) => (
                    <ClaimScriptureRef key={`${s.ref}-${i}`} reference={s.ref} note={s.note} />
                  ))
                ) : (
                  <li className="text-muted-foreground">—</li>
                )}
              </ul>
            </div>
            <div className="space-y-2">
              <div className="uppercase tracking-wider text-muted-foreground">Challenges</div>
              <ul className="space-y-2">
                {c.scripture_challenges?.length ? (
                  c.scripture_challenges.map((s, i) => (
                    <ClaimScriptureRef key={`${s.ref}-${i}`} reference={s.ref} note={s.note} />
                  ))
                ) : (
                  <li className="text-muted-foreground">—</li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div
          className="flex flex-wrap items-center gap-1 border-t border-border/50 pt-3"
          role="toolbar"
          aria-label="Claim actions"
        >
          <ClaimIconActionButton
            label="Research"
            icon={MessageCircle}
            tone="research"
            active
            onClick={() => startClaimResearchChat(c, source)}
          />
          <ClaimIconActionButton
            label="Reflect"
            icon={NotebookPen}
            tone="reflect"
            onClick={() => openJournalFromClaim(c, source?.startSeconds ?? undefined)}
          />
          <ClaimIconActionButton
            label={isDeferredVerdict(c.verdict) ? "In queue (research later)" : "Research later"}
            icon={Clock}
            tone="researchLater"
            active={isDeferredVerdict(c.verdict)}
            onClick={() => void toggleResearchLater(c.id, c.verdict)}
          />
          <span className="mx-0.5 hidden h-5 w-px bg-border/60 sm:inline" aria-hidden />
          <ClaimIconActionButton
            label="Keep"
            icon={Check}
            tone="keep"
            active={c.verdict === "keep"}
            onClick={() => void setVerdict(c.id, "keep")}
          />
          <ClaimIconActionButton
            label="Reject"
            icon={X}
            tone="reject"
            active={c.verdict === "reject"}
            onClick={() => void setVerdict(c.id, "reject")}
          />
          <ClaimIconActionButton
            label="Update my belief"
            icon={Pencil}
            tone="update"
            active={c.verdict === "updated"}
            onClick={() => void setVerdict(c.id, "updated")}
          />
          <ClaimIconActionButton
            label="Defer"
            icon={CirclePause}
            tone="defer"
            active={c.verdict === "defer"}
            onClick={() => void setVerdict(c.id, "defer")}
          />
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

  /** Immersive header + main padding for `lg` split-pane height. */
  const artifactSplitPaneHeightClass = "lg:h-[calc(100dvh-8.25rem)]";

  const youtubeHeaderLeading =
    a.kind === "youtube" ? (
      (() => {
        const thumb =
          mergedVideoMeta.thumbnail_url ||
          (youTubeVideoId ? `https://i.ytimg.com/vi/${youTubeVideoId}/hqdefault.jpg` : null);
        const channel = mergedVideoMeta.channel_title?.trim();
        const channelUrl = mergedVideoMeta.channel_url?.trim();
        const displayTitle = a.title?.trim() || mergedVideoMeta.title?.trim() || "Untitled video";

        return (
          <div className="flex min-w-0 items-center gap-3">
            {thumb ? (
              <button
                type="button"
                onClick={scrollToVideoSection}
                className="group relative shrink-0 overflow-hidden rounded-lg ring-1 ring-border/60 shadow-sm transition hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Scroll to video"
              >
                <img
                  src={thumb}
                  alt=""
                  className="h-14 w-[4.75rem] object-cover bg-muted transition group-hover:opacity-90 sm:h-[4.25rem] sm:w-28"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
                  <Youtube className="h-5 w-5 text-white opacity-0 drop-shadow transition group-hover:opacity-100" aria-hidden />
                </span>
              </button>
            ) : (
              <span className="flex h-14 w-[4.75rem] shrink-0 items-center justify-center rounded-lg bg-red-600/10 ring-1 ring-border/60 sm:h-[4.25rem] sm:w-28">
                <Youtube className="h-6 w-6 text-red-600" aria-hidden />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-500">
                  <Youtube className="h-3 w-3" aria-hidden />
                  YouTube
                </span>
                <span className="text-border" aria-hidden>
                  ·
                </span>
                <span className={cn("inline-flex items-center gap-1", inFlight && "text-foreground")}>
                  {inFlight ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden /> : null}
                  {formatArtifactStatus(a.status)}
                </span>
              </div>
              <h1 className="font-display text-base font-normal leading-snug text-foreground line-clamp-2 sm:text-lg md:line-clamp-3">
                {displayTitle}
              </h1>
              {channel ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {channelUrl ? (
                    <a
                      href={channelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1 hover:text-foreground hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="truncate">{channel}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                    </a>
                  ) : (
                    channel
                  )}
                </p>
              ) : null}
            </div>
          </div>
        );
      })()
    ) : null;

  const pageNavLinkClass = (href: string) =>
    cn(
      "relative inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      pageSectionHash === href
        ? "bg-background text-foreground shadow-sm ring-1 ring-border/60 after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:rounded-full after:bg-primary/70"
        : "text-muted-foreground hover:bg-background/55 hover:text-foreground",
    );

  const artifactHeaderActions = (
    <>
      {a.kind === "youtube" && (
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPasteOpen(true)}>
          <FileText className="w-3.5 h-3.5 sm:mr-1" aria-hidden />
          <span className="hidden sm:inline">Paste transcript</span>
          <span className="sr-only sm:hidden">Paste transcript</span>
        </Button>
      )}
      {a.kind === "youtube" && a.status === "ready" && (
        <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setWrapUpOpen(true)}>
          Wrap up
        </Button>
      )}
      {!inFlight && a.status !== "error" && (
        <Button size="sm" variant="ghost" onClick={reanalyze} className="h-7 text-xs">
          <RefreshCw className="w-3.5 h-3.5 sm:mr-1" aria-hidden />
          <span className="hidden sm:inline">Re-analyze</span>
          <span className="sr-only sm:hidden">Re-analyze</span>
        </Button>
      )}
    </>
  );

  return (
    <FrameworkLayout
      title={youtubeHeaderLeading ? undefined : a.title || "Untitled artifact"}
      headerLeading={youtubeHeaderLeading}
      back="/framework/artifacts"
      contentClassName="max-w-none"
      headerContentClassName="max-w-none"
      headerActions={artifactHeaderActions}
    >
      {a.kind !== "youtube" ? (
        <div
          className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-border/60 bg-muted/25 px-3.5 py-2.5 text-sm shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]"
          role="status"
          aria-label="Artifact status"
        >
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            {formatArtifactKind(a.kind)}
          </span>
          <span className="hidden text-border sm:inline" aria-hidden>
            |
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {inFlight ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden /> : null}
            <span className={cn(inFlight && "text-foreground")}>{formatArtifactStatus(a.status)}</span>
          </span>
        </div>
      ) : null}

      <div
        className={`lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-6 lg:min-h-0 ${artifactSplitPaneHeightClass}`}
      >
        <div ref={mainScrollRef} className="min-h-0 space-y-6 lg:col-span-8 lg:overflow-y-auto lg:pr-1">
      {a.kind === "youtube" && a.status === "ready" && (
        <nav
          aria-label="On this page"
          className="sticky top-0 z-[15] rounded-2xl border border-border/60 bg-muted/30 p-2 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-md supports-[backdrop-filter]:bg-muted/25 dark:ring-white/[0.03]"
        >
          <p className="mb-1.5 px-2 text-xs font-medium text-muted-foreground">On this page</p>
          <div className="flex flex-wrap gap-1">
          {youTubeVideoId ? (
            <a href="#video" className={pageNavLinkClass("#video")} aria-current={pageSectionHash === "#video" ? "location" : undefined}>
              Video
            </a>
          ) : null}
          {a.url ? (
            <a href="#chapters" className={pageNavLinkClass("#chapters")} aria-current={pageSectionHash === "#chapters" ? "location" : undefined}>
              Chapters
            </a>
          ) : null}
          {a.kind === "youtube" && youtubeChaptersList.length === 0 ? (
            <a
              href="#study-spine-teachings"
              className={pageNavLinkClass("#study-spine-teachings")}
              aria-current={pageSectionHash === "#study-spine-teachings" ? "location" : undefined}
            >
              Teachings
            </a>
          ) : null}
          {claims.length > 0 ? (
            <>
              <a href="#claims" className={pageNavLinkClass("#claims")} aria-current={pageSectionHash === "#claims" ? "location" : undefined}>
                Claims
              </a>
              <a
                href="#claims-index"
                className={cn(pageNavLinkClass("#claims-index"), "gap-1.5")}
                aria-current={pageSectionHash === "#claims-index" ? "location" : undefined}
              >
                <ListOrdered className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                Index
              </a>
            </>
          ) : null}
          {youTubeVideoId ? (
            <a href="#capture" className={pageNavLinkClass("#capture")} aria-current={pageSectionHash === "#capture" ? "location" : undefined}>
              Capture
            </a>
          ) : null}
          </div>
        </nav>
      )}
      {a.kind === "youtube" && !youTubeVideoId && (() => {
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
          <section className="mb-6 rounded-2xl border border-border/60 bg-card p-4 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]">
            <div className="flex items-center gap-3">
              {thumb && (
                <img src={thumb} alt="" className="h-16 w-28 rounded object-cover bg-muted flex-none" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">{provider}</div>
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

      {youTubeVideoId && (
        <section
          id="video"
          className="scroll-mt-32 mb-6 overflow-hidden rounded-2xl border border-border/60 bg-card p-3 shadow-page ring-1 ring-black/[0.03] sm:p-4 lg:mb-0 dark:ring-white/[0.04]"
        >
          <div>
            <div
              ref={youtubePip.videoSlotRef}
              className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted/20 shadow-soft"
            >
              {!youtubePip.pipMode && embedSrc ? (
                <iframe
                  key={`inline-${youTubeVideoId}`}
                  title="YouTube video"
                  src={embedSrc}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : embedSrc ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={youtubePip.scrollVideoIntoView}
                    className="text-xs text-muted-foreground transition hover:opacity-90"
                  >
                    <span className="rounded-full border bg-background/90 px-3 py-1 shadow">
                      Tap to bring video back
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex h-full min-h-[12rem] items-center justify-center text-xs text-muted-foreground">
                  Video unavailable
                </div>
              )}
            </div>
            {youtubePip.pipMode && youtubePip.pipChromeLayout && embedSrc && youTubeVideoId ? (
              <ArtifactYoutubePipOverlay
                embedSrc={embedSrc}
                youTubeVideoId={youTubeVideoId}
                layout={youtubePip.pipChromeLayout}
                onScrollVideoIntoView={youtubePip.scrollVideoIntoView}
                onDragHeaderPointerDown={youtubePip.onPipDragHeaderPointerDown}
                onDragHeaderPointerMove={youtubePip.onPipDragHeaderPointerMove}
                onDragHeaderPointerUp={youtubePip.onPipDragHeaderPointerUp}
                onResizePointerDown={youtubePip.onPipResizePointerDown}
                onResizePointerMove={youtubePip.onPipResizePointerMove}
                onResizePointerUp={youtubePip.onPipResizePointerUp}
              />
            ) : null}
          </div>

          <div
            id="capture"
            className="scroll-mt-28 mt-5 rounded-xl border border-border/60 bg-muted/20 p-4 ring-1 ring-black/[0.02] dark:ring-white/[0.03] lg:mt-6"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border/40 pb-3">
              <div>
                <h3 className="font-display text-sm font-normal text-foreground sm:text-base">Capture while watching</h3>
                <p className="text-xs text-muted-foreground">
                  Save bookmarks, notes, and belief seeds. Timestamps follow chapter jumps and transcript seeks.
                </p>
              </div>
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
                      title="Floating study journal on this page (timestamp inserts use the last chapter jump)"
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
        <section
          id="chapters"
          className="scroll-mt-28 mb-6 rounded-2xl border border-border/60 bg-card p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5 dark:ring-white/[0.03]"
        >
          {a.status === "ready" && (
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              {youtubeChaptersSourceLabel ?? (
                <>
                  <span className="font-medium text-foreground">Chapters</span> help you jump through the talk. We use the creator&apos;s description timestamps when available; otherwise we outline sections from your transcript.
                </>
              )}
            </p>
          )}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-medium">
            <LayoutList className="h-4 w-4 text-muted-foreground" aria-hidden />
            Chapters
            {youtubeChaptersList.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {youtubeChaptersList.length} section{youtubeChaptersList.length === 1 ? "" : "s"}
              </span>
            )}
            {a.status === "ready" && a.raw_text && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto h-7 text-xs"
                disabled={generatingChapters || inFlight}
                onClick={() => generateChaptersFromTranscript(youtubeChaptersList.length > 0)}
              >
                {generatingChapters ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                {generatingChapters
                  ? "Generating…"
                  : youtubeChaptersList.length > 0
                    ? "Regenerate"
                    : "Generate from transcript"}
              </Button>
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
            <p className="text-xs text-muted-foreground">
              {generatingChapters
                ? "Outlining sections from your transcript…"
                : "No chapters yet. Tap Generate from transcript, or wait — we try automatically when the transcript is ready."}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Chapters appear after the transcript is ready.</p>
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
            This video has no chapter outline yet, so we lean on extracted <span className="font-medium text-foreground">teachings</span> (what the speaker invites you toward) alongside claims. Generate chapters above for section jumps, or use{" "}
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
          {deferredOnArtifact > 0 ? (
            <p className="mt-2 text-xs">
              <Link to="/framework/research-later" className="font-medium text-foreground underline-offset-2 hover:underline inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden />
                {deferredOnArtifact} in your research queue
              </Link>
            </p>
          ) : null}
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
        <div id="claims" className="scroll-mt-24 max-w-4xl space-y-6">
          <ClaimsGlossary entries={glossaryEntries} onJump={jumpToClaim} className="mb-2" />
          <div className="space-y-8">
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
              embedAvailable={Boolean(youTubeVideoId)}
              playerReady={Boolean(youTubeVideoId)}
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
              <span>Reviewed claim cards (Keep / Reject / Update / Defer) where it helped</span>
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
