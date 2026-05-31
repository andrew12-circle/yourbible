import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2, RefreshCw, FileText, ExternalLink, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { BeliefInfluenceAttachment } from "@/lib/framework/quickBelief";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { floatingJournalPlaybackRef } from "@/lib/journal/floatingJournalPlaybackRef";
import { floatingJournalInsertRef } from "@/lib/journal/floatingJournalInsertRef";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";
import TranscriptPanel from "@/components/framework/TranscriptPanel";
import ArtifactEntitiesPanel from "@/components/framework/ArtifactEntitiesPanel";
import TeachingsPanel from "@/components/framework/TeachingsPanel";
import { type ClaimsGlossaryEntry } from "@/components/framework/ClaimsGlossary";
import ArtifactCollapsibleSection from "@/components/framework/artifact-detail/ArtifactCollapsibleSection";
import ArtifactDesktopOverview from "@/components/framework/artifact-detail/ArtifactDesktopOverview";
import ArtifactMobileInsightExploreSlot from "@/components/framework/artifact-detail/ArtifactMobileInsightExploreSlot";
import ArtifactMobileOverview from "@/components/framework/artifact-detail/ArtifactMobileOverview";
import ArtifactMobileNotesTab from "@/components/framework/artifact-detail/ArtifactMobileNotesTab";
import ArtifactDetailPageDialogs from "@/components/framework/artifact-detail/ArtifactDetailPageDialogs";
import MobileAppDock from "@/components/navigation/MobileAppDock";
import ArtifactDetailDesktopShell from "@/components/framework/artifact-detail/ArtifactDetailDesktopShell";
import {
  type RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";
import ArtifactDetailHeader from "@/components/framework/artifact-detail/ArtifactDetailHeader";
import ArtifactSectionNav, { type ArtifactNavSection } from "@/components/framework/artifact-detail/ArtifactSectionNav";
import ArtifactChaptersSection from "@/components/framework/artifact-detail/ArtifactChaptersSection";
import ArtifactClaimsSection from "@/components/framework/artifact-detail/ArtifactClaimsSection";
import ArtifactHeaderActions from "@/components/framework/artifact-detail/ArtifactHeaderActions";
import ArtifactDetailLoadingSkeleton from "@/components/framework/artifact-detail/ArtifactDetailLoadingSkeleton";
import ArtifactPipelineBanner from "@/components/framework/artifact-detail/ArtifactPipelineBanner";
import ArtifactYoutubeVideoBlock from "@/components/framework/artifact-detail/ArtifactYoutubeVideoBlock";
import {
  isArtifactLayoutDesktop,
  isArtifactStickyVideo,
  useArtifactLayoutMode,
} from "@/hooks/useArtifactLayoutMode";
import { useArtifactDetailData } from "@/hooks/useArtifactDetailData";
import { useArtifactDetailMobileTabs } from "@/hooks/useArtifactDetailMobileTabs";
import { useArtifactMobileInsightExplore } from "@/hooks/useArtifactMobileInsightExplore";
import { useArtifactEntityCount } from "@/hooks/useArtifactEntityCount";
import { useArtifactVideoPlayback } from "@/hooks/useArtifactVideoPlayback";
import {
  artifactCard,
  artifactDesktopBodySheet,
  artifactMobileDockPadding,
  artifactMobilePinnedHeaderPadding,
  artifactPremiumCard,
  artifactScrollMt,
  artifactStudyBodyMobile,
} from "@/lib/framework/artifactSurfaces";
import { getClaimSeekSeconds } from "@/lib/framework/claimPlaybackSync";
import { scrollArtifactClaimIntoView } from "@/lib/framework/scrollArtifactClaimIntoView";
import { groupClaimsUnderYoutubeChapters } from "@/lib/framework/groupClaimsUnderYoutubeChapters";
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
  const {
    a,
    setA,
    artifactLoaded,
    claims,
    setClaims,
    matchedBeliefs,
    moments,
    setMoments,
    polling,
    elapsed,
    inFlight,
    patchArtifactMetadata,
  } = useArtifactDetailData(id, user?.id);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [savingPaste, setSavingPaste] = useState(false);
  const [formattingTranscript, setFormattingTranscript] = useState(false);
  const [liveMeta, setLiveMeta] = useState<ArtifactMetadata | null>(null);
  const [refreshingMeta, setRefreshingMeta] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [savingMoment, setSavingMoment] = useState(false);
  const [quickBeliefOpen, setQuickBeliefOpen] = useState(false);
  const [quickBeliefText, setQuickBeliefText] = useState("");
  const [quickBeliefSource, setQuickBeliefSource] = useState("");
  const [wrapUpOpen, setWrapUpOpen] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileBodyScrollRef = useRef<HTMLDivElement | null>(null);
  const [mobileChromeHost, setMobileChromeHost] = useState<HTMLDivElement | null>(null);
  const transcriptRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const repairedRef = useRef(false);
  const lastBookmarkJournalInsertAtRef = useRef(0);
  const [syncingYoutubeChapters, setSyncingYoutubeChapters] = useState(false);
  const [generatingChapters, setGeneratingChapters] = useState(false);
  const [pageSectionHash, setPageSectionHash] = useState(() =>
    typeof window !== "undefined" ? window.location.hash : "",
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const floatingJournalOpen = useFloatingJournalStore((s) => s.panelOpen);
  const toggleFloatingJournal = useFloatingJournalStore((s) => s.togglePanel);
  const { mobileTab, onTabChange, openStudyTab, openTranscriptTab, openNotesTab } =
    useArtifactDetailMobileTabs();
  const entitiesCount = useArtifactEntityCount(a?.id, a?.status);
  const [mobileOpenClaimId, setMobileOpenClaimId] = useState<string | null>(null);
  const [mobileNoteSectionOpen, setMobileNoteSectionOpen] = useState(false);
  const resetMobileStudyScroll = useCallback(() => {
    window.requestAnimationFrame(() => {
      mobileBodyScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });
  }, []);
  const {
    mobileInsightExploreClaimId,
    setMobileInsightExploreClaimId,
    closeMobileInsightExplore,
  } = useArtifactMobileInsightExplore(mobileTab, resetMobileStudyScroll);
  const openNotesTabWithNote = useCallback(() => {
    setMobileNoteSectionOpen(true);
    openNotesTab();
  }, [openNotesTab]);

  const layoutMode = useArtifactLayoutMode();
  const isDesktop = isArtifactLayoutDesktop(layoutMode);
  const createProcessingToken = () => crypto.randomUUID();

  const navigateToArtifactHash = useCallback((hash: string) => {
    const sectionId = hash.replace(/^#/, "");
    if (!sectionId) return;
    if (sectionId === "transcript") {
      openTranscriptTab();
      return;
    }
    if (sectionId === "notes" || sectionId === "capture") {
      openNotesTab();
      return;
    }
    openStudyTab();
    window.location.hash = sectionId;
    window.requestAnimationFrame(() => {
      scrollArtifactClaimIntoView(document.getElementById(sectionId));
    });
  }, [openStudyTab, openTranscriptTab, openNotesTab]);

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

  const videoPlayback = useArtifactVideoPlayback({
    artifactId: id,
    youTubeVideoId,
    mainScrollRef,
    transcriptSegments,
    transcriptRefs,
  });
  const {
    pipEnabled,
    youtubePip,
    youtubePlayer,
    playbackFallbackRef,
    seekVideoToSeconds,
    getPlaybackSeconds,
    togglePlayback,
  } = videoPlayback;

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
    floatingJournalPlaybackRef.current = () => getPlaybackSeconds();
    useFloatingJournalStore.getState().setPlaybackCaptureAvailable(canCapturePlaybackForJournal);
    return () => {
      floatingJournalPlaybackRef.current = null;
      useFloatingJournalStore.getState().setPlaybackCaptureAvailable(false);
    };
  }, [a, a?.id, a?.kind, canCapturePlaybackForJournal, getPlaybackSeconds]);

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

  const desktopPremiumYoutube = isDesktop && a?.kind === "youtube" && Boolean(youTubeVideoId);
  const claimsHorizontalRail = desktopPremiumYoutube || (!isDesktop && Boolean(youTubeVideoId));

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || !claims.some((c) => c.id === hash)) return;
    const t = window.setTimeout(() => {
      scrollArtifactClaimIntoView(document.getElementById(hash), {
        horizontalRail: claimsHorizontalRail,
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [claims, a?.status, claimsHorizontalRail]);

  const scrollToVideoSection = useCallback(() => {
    document.getElementById("video")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const getCurrentPlaybackSeconds = getPlaybackSeconds;

  const resolveClaimSeekSeconds = useCallback(
    (claim: Claim) => getClaimSeekSeconds(claim, claimSources[claim.id]),
    [claimSources],
  );

  const navSections = useMemo((): ArtifactNavSection[] => {
    if (!a || a.kind !== "youtube" || a.status !== "ready") return [];
    const sections: ArtifactNavSection[] = [];
    if (youTubeVideoId) {
      sections.push(
        desktopPremiumYoutube
          ? { id: "overview", hash: "#overview", label: "Overview" }
          : { id: "video", hash: "#video", label: "Video" },
      );
    }
    if (a.url) sections.push({ id: "chapters", hash: "#chapters", label: "Chapters" });
    if (a.kind === "youtube" && youtubeChaptersList.length === 0) {
      sections.push({ id: "teachings", hash: "#study-spine-teachings", label: "Teachings" });
    }
    const pinnedMobileYoutube =
      !isDesktop && isArtifactStickyVideo(layoutMode, Boolean(youTubeVideoId));
    if (claims.length > 0) {
      sections.push({ id: "claims", hash: "#claims", label: "Claims" });
      sections.push({ id: "claims-index", hash: "#claims-index", label: "Index", icon: "index" });
    }
    if (youTubeVideoId) {
      sections.push(
        pinnedMobileYoutube
          ? { id: "notes", hash: "#notes", label: "Notes" }
          : { id: "capture", hash: "#capture", label: "Capture" },
      );
    }
    if (pinnedMobileYoutube && a.status === "ready") {
      sections.unshift({ id: "overview", hash: "#overview", label: "Overview" });
    }
    return sections;
  }, [
    a,
    a?.kind,
    a?.status,
    a?.url,
    youTubeVideoId,
    youtubeChaptersList.length,
    claims.length,
    desktopPremiumYoutube,
    isDesktop,
    layoutMode,
  ]);

  const scrollToClaimById = useCallback(
    (claimId: string) => {
      scrollArtifactClaimIntoView(document.getElementById(claimId), {
        horizontalRail: claimsHorizontalRail,
      });
    },
    [claimsHorizontalRail],
  );

  const advanceMobileClaim = useCallback(
    (currentId: string) => {
      if (isDesktop) return;
      const idx = claims.findIndex((c) => c.id === currentId);
      const next = idx >= 0 ? claims[idx + 1] : undefined;
      if (!next) {
        setMobileOpenClaimId(null);
        return;
      }
      setMobileOpenClaimId(next.id);
      window.requestAnimationFrame(() => {
        document.getElementById(next.id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    },
    [claims, isDesktop],
  );

  useEffect(() => {
    if (isDesktop || claims.length === 0) return;
    setMobileOpenClaimId((prev) => {
      if (prev && claims.some((c) => c.id === prev)) return prev;
      return claims[0]?.id ?? null;
    });
  }, [claims, isDesktop]);

  const jumpToTranscriptSource = useCallback(
    (segment: TranscriptSegment | null) => {
      if (!segment || segment.isParagraphBreak) return;
      transcriptRefs.current[segment.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (segment.startSeconds != null) seekVideoToSeconds(segment.startSeconds, { play: true });
    },
    [seekVideoToSeconds],
  );

  const playClaimAtSource = useCallback(
    (claim: Claim, source: TranscriptSegment | null | undefined) => {
      const seconds = getClaimSeekSeconds(claim, source ?? null);
      if (seconds == null) {
        jumpToTranscriptSource(source ?? null);
        return;
      }
      if (source && !source.isParagraphBreak) {
        transcriptRefs.current[source.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      seekVideoToSeconds(seconds, { play: true });
    },
    [jumpToTranscriptSource, seekVideoToSeconds],
  );

  const openMobileInsightExplore = useCallback(
    (claimId: string) => {
      openStudyTab();
      setMobileInsightExploreClaimId(claimId);
      const claim = claims.find((c) => c.id === claimId);
      if (claim) void playClaimAtSource(claim, claimSources[claim.id]);
    },
    [claims, claimSources, openStudyTab, playClaimAtSource, setMobileInsightExploreClaimId],
  );

  if (loading) {
    return (
      <FrameworkLayout
        title="Artifact"
        back="/framework/artifacts"
        contentClassName="max-w-none"
        headerContentClassName="max-w-none"
      >
        <ArtifactDetailLoadingSkeleton />
      </FrameworkLayout>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!artifactLoaded) {
    return (
      <FrameworkLayout
        title="Artifact"
        back="/framework/artifacts"
        contentClassName="max-w-none"
        headerContentClassName="max-w-none"
      >
        <ArtifactDetailLoadingSkeleton />
      </FrameworkLayout>
    );
  }
  if (!a) {
    return (
      <FrameworkLayout
        title="Artifact"
        back="/framework/artifacts"
        contentClassName="max-w-none"
        headerContentClassName="max-w-none"
      >
        <p className="py-12 text-sm text-muted-foreground">
          Artifact not found.{" "}
          <Link to="/framework/artifacts" className="font-medium text-foreground underline-offset-2 hover:underline">
            Back to artifacts
          </Link>
        </p>
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

  const applyClaimVerdict = async (cid: string, verdict: ClaimVerdict | null) => {
    await setVerdict(cid, verdict);
    if (!isDesktop && verdict && verdict !== "defer") {
      advanceMobileClaim(cid);
    }
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
    const claim = claims[claimNumber - 1];
    if (!isDesktop && claim) {
      setMobileOpenClaimId(claim.id);
      window.requestAnimationFrame(() => {
        scrollArtifactClaimIntoView(document.getElementById(claim.id));
      });
      return;
    }
    const el = document.querySelector(`[data-claim-number="${claimNumber}"]`);
    scrollArtifactClaimIntoView(el, { horizontalRail: claimsHorizontalRail });
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

  const syncYouTubeChapters = async () => {
    if (!a || a.kind !== "youtube") return;
    setSyncingYoutubeChapters(true);
    try {
      const { error } = await supabase.functions.invoke("framework-sync-youtube-chapters", {
        body: { artifact_id: a.id },
      });
      if (error) throw error;
      await patchArtifactMetadata(a.id);
      toast({ title: "Synced chapters from YouTube" });
    } catch {
      toast({ title: "Could not sync chapters from YouTube", variant: "destructive" });
    } finally {
      setSyncingYoutubeChapters(false);
    }
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

  const bookmarkAtSeconds = async (seconds: number, label?: string | null) => {
    const t = Math.max(0, Math.floor(seconds));
    const saved = await saveMoment("bookmark", {
      label: label ?? bookmarkLabel,
      startSeconds: t,
      toastDescription: label?.trim()
        ? `Bookmarked at ${formatTranscriptClock(t)}`
        : null,
    });
    if (saved && label?.trim()) return;
    if (saved) setBookmarkLabel("");
  };

  const journalTranscriptSegment = (seconds: number, snippet: string) => {
    const t = Math.max(0, Math.floor(seconds));
    seekVideoToSeconds(t, { play: false });
    openStudyJournal();
    const routeId = useFloatingJournalStore.getState().routeArtifact?.id;
    const insertTarget = floatingJournalInsertRef.current;
    if (insertTarget?.artifactId === a.id && routeId === a.id) {
      const block = `\n\n---\n\n#### Transcript · ${formatTranscriptClock(t)}\n\n> ${snippet}\n\n`;
      insertTarget.append(block);
      toast({
        title: "Added to journal",
        description: `Quoted line at ${formatTranscriptClock(t)}`,
      });
      return;
    }
    openJournalFromArtifact(t);
  };

  const researchLaterTranscriptSegment = async (seconds: number, snippet: string) => {
    const t = Math.max(0, Math.floor(seconds));
    await saveMoment("bookmark", {
      label: "Research later",
      body: snippet,
      startSeconds: t,
      toastDescription: `Saved at ${formatTranscriptClock(t)} — find it in your moments on this video.`,
    });
  };

  const saveSegmentNote = async (seconds: number) => {
    const t = Math.max(0, Math.floor(seconds));
    const saved = await saveMoment("note", { body: noteBody, startSeconds: t });
    if (saved) setNoteBody("");
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

  const claimCardContext: RenderClaimCardContext = {
    isDesktop,
    youTubeVideoId,
    claimSources,
    matchedBeliefs,
    playClaimAtSource,
    startClaimResearchChat,
    openJournalFromClaim,
    toggleResearchLater,
    applyClaimVerdict,
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
  const artifactSplitPaneHeightClass = desktopPremiumYoutube
    ? "lg:h-[calc(100dvh-1.5rem)]"
    : "lg:h-[calc(100dvh-8.25rem)]";

  const youtubeHeaderLeading =
    a.kind === "youtube" && !desktopPremiumYoutube ? (
      <ArtifactDetailHeader
        displayTitle={a.title?.trim() || mergedVideoMeta.title?.trim() || "Untitled video"}
        statusLabel={formatArtifactStatus(a.status)}
        inFlight={inFlight}
        channel={mergedVideoMeta.channel_title}
        channelUrl={mergedVideoMeta.channel_url}
        thumbnailUrl={mergedVideoMeta.thumbnail_url}
        youTubeVideoId={youTubeVideoId}
        onScrollToVideo={scrollToVideoSection}
      />
    ) : null;

  const artifactHeaderActions = (
    <ArtifactHeaderActions
      showPaste={a.kind === "youtube"}
      showWrapUp={a.kind === "youtube" && a.status === "ready"}
      showReanalyze={!inFlight && a.status !== "error"}
      onPaste={() => setPasteOpen(true)}
      onWrapUp={() => setWrapUpOpen(true)}
      onReanalyze={reanalyze}
    />
  );

  const displayTitle = a.title?.trim() || mergedVideoMeta.title?.trim() || "Untitled video";
  const stickyVideoMode = isArtifactStickyVideo(layoutMode, Boolean(youTubeVideoId));
  const mobilePinnedPane = !isDesktop && stickyVideoMode;

  const showMobileOverview = mobilePinnedPane && a.status === "ready";
  const mobileInsightExploreOpen = Boolean(mobilePinnedPane && mobileInsightExploreClaimId);
  const mobileInsightExplorePanel = (
    <ArtifactMobileInsightExploreSlot
      enabled={mobilePinnedPane && mobileTab === "study"}
      claimId={mobileInsightExploreClaimId}
      claims={claims}
      claimCardContext={claimCardContext}
      onBack={closeMobileInsightExplore}
    />
  );

  const StudyColumnWrapper = ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) =>
    !isDesktop ? (
      <TabsContent value="study" className="mt-0 px-3 pb-8 focus-visible:outline-none sm:px-4">
        <div className={artifactStudyBodyMobile}>{children}</div>
      </TabsContent>
    ) : (
      <div className={cn("space-y-5 sm:space-y-6", className)}>{children}</div>
    );

  const transcriptPanel = a.raw_text ? (
    <TranscriptPanel
      artifactId={a.id}
      segments={transcriptSegments}
      timed={transcriptTimedLayout}
      coarseTimestampsOnly={transcriptCoarseOnly}
      embedAvailable={Boolean(youTubeVideoId)}
      playerReady={videoPlayback.playerReady}
      isPlaying={videoPlayback.isPlaying}
      onTogglePlayback={togglePlayback}
      getPlaybackSeconds={getCurrentPlaybackSeconds}
      onSeek={(seconds) => seekVideoToSeconds(seconds, { play: true })}
      canBookmark={canCaptureMoments}
      bookmarking={savingMoment}
      onBookmarkSegment={
        isDesktop ? (seconds, snippet) => void bookmarkAtSeconds(seconds, snippet) : undefined
      }
      onCopy={copyTranscript}
      onJournal={() => openJournalFromArtifact()}
      fullPageJournalLabel="Full-page journal"
      onRetryFetch={a.kind === "youtube" && a.url ? retryFetch : undefined}
      retryDisabled={inFlight}
      setSegmentRef={(id, el) => {
        transcriptRefs.current[id] = el;
      }}
      showFormatButton={transcriptNeedsFormatting}
      formattingTranscript={formattingTranscript}
      onFormatTranscript={formatTranscript}
      embeddedInMobileTab={!isDesktop}
      variant={
        desktopPremiumYoutube
          ? "desktopStudy"
          : !isDesktop && a.kind === "youtube"
            ? "youtubeMobile"
            : "default"
      }
      setPlaybackRate={youtubePlayer.setPlaybackRate}
      getIsPlaying={videoPlayback.getIsPlaying}
      onPauseVideo={videoPlayback.pauseVideo}
      onResumePlayback={videoPlayback.playVideo}
      segmentBookmarkActions={
        !isDesktop && a.kind === "youtube"
          ? {
              onSaveBookmark: (seconds, snippet) => void bookmarkAtSeconds(seconds, snippet),
              onJournal: journalTranscriptSegment,
              onResearchLater: (seconds, snippet) =>
                void researchLaterTranscriptSegment(seconds, snippet),
            }
          : undefined
      }
      noteBody={noteBody}
      onNoteBodyChange={setNoteBody}
      notePolishResetKey={a.id}
      onSaveSegmentNote={saveSegmentNote}
      outerScrollContainerRef={mobilePinnedPane ? mobileBodyScrollRef : undefined}
      transcriptTabActive={!isDesktop ? mobileTab === "transcript" : true}
    />
  ) : null;

  return (
    <FrameworkLayout
      title={youtubeHeaderLeading ? undefined : a.title || "Untitled artifact"}
      headerLeading={youtubeHeaderLeading}
      immersiveMobileMinimal={a.kind === "youtube" && Boolean(youTubeVideoId)}
      immersiveDesktopMinimal={desktopPremiumYoutube}
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
        className={cn(
          "space-y-6 lg:grid lg:min-h-0 lg:grid-cols-12 lg:items-stretch lg:gap-6",
          artifactSplitPaneHeightClass,
          mobilePinnedPane && "flex min-h-0 flex-1 flex-col space-y-0 overflow-hidden",
        )}
      >
        <Tabs
          value={mobileTab}
          onValueChange={onTabChange}
          className={cn(
            "min-w-0 lg:col-span-8 lg:flex lg:min-h-0 lg:flex-col",
            mobilePinnedPane && "flex min-h-0 flex-1 flex-col overflow-hidden",
          )}
        >
        <div
          ref={mainScrollRef}
          className={cn(
            "min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:scrollbar-hover-thin",
            mobilePinnedPane ? "relative h-full min-h-0 w-full" : "space-y-5 sm:space-y-6",
          )}
        >
        {youTubeVideoId ? (
          desktopPremiumYoutube ? (
            <ArtifactDetailDesktopShell
              hero={{
                displayTitle,
                statusLabel: formatArtifactStatus(a.status),
                inFlight,
                channel: mergedVideoMeta.channel_title,
                channelUrl: mergedVideoMeta.channel_url,
                thumbnailUrl: mergedVideoMeta.thumbnail_url,
                youTubeVideoId,
                durationSeconds: mergedVideoMeta.duration_seconds ?? artifactMetadata.duration_seconds,
                createdAt: a.created_at,
                isPlaying: videoPlayback.isPlaying,
                onPlayStudy: () => {
                  if (videoPlayback.playerReady) {
                    if (!videoPlayback.isPlaying) videoPlayback.activateAndPlay();
                    else videoPlayback.pauseVideo();
                  } else {
                    videoPlayback.activateAndPlay();
                  }
                  navigateToArtifactHash("#overview");
                },
                onPlayVideo: () => {
                  if (videoPlayback.playerReady) {
                    if (!videoPlayback.isPlaying) videoPlayback.playVideo();
                    else videoPlayback.pauseVideo();
                  } else {
                    videoPlayback.activateAndPlay();
                  }
                },
                onAddNote: () => navigateToArtifactHash("#capture"),
                showPaste: a.kind === "youtube",
                showWrapUp: a.kind === "youtube" && a.status === "ready",
                showReanalyze: !inFlight && a.status !== "error",
                onPasteTranscript: () => setPasteOpen(true),
                onWrapUp: () => setWrapUpOpen(true),
                onReanalyze: reanalyze,
              }}
              videoBlock={
                <ArtifactYoutubeVideoBlock
                  youTubeVideoId={youTubeVideoId}
                  youtubePip={youtubePip}
                  pipEnabled={pipEnabled}
                  stickyMode={stickyVideoMode}
                  heroEmbed={desktopPremiumYoutube}
                  youtubePlayer={youtubePlayer}
                  playback={videoPlayback}
                  artifactId={a.id}
                  moments={moments}
                  bookmarkLabel={bookmarkLabel}
                  onBookmarkLabelChange={setBookmarkLabel}
                  noteBody={noteBody}
                  onNoteBodyChange={setNoteBody}
                  canCaptureMoments={canCaptureMoments}
                  savingMoment={savingMoment}
                  hasTranscript={Boolean(a.raw_text?.trim())}
                  onBookmark={bookmarkCurrentMoment}
                  onSaveNote={addNoteAtCurrentMoment}
                  onBelieve={believeCurrentMoment}
                  onStudyJournal={openStudyJournal}
                  onOpenJournalTimestamp={() => openJournalFromArtifact(getCurrentPlaybackSeconds())}
                  onOpenJournalFull={() => openJournalFromArtifact()}
                />
              }
            />
          ) : (
          <ArtifactYoutubeVideoBlock
            youTubeVideoId={youTubeVideoId}
            displayTitle={stickyVideoMode ? displayTitle : undefined}
            channel={stickyVideoMode ? mergedVideoMeta.channel_title : undefined}
            channelUrl={stickyVideoMode ? mergedVideoMeta.channel_url : undefined}
            providerName={stickyVideoMode ? mergedVideoMeta.provider_name : undefined}
            thumbnailUrl={mergedVideoMeta.thumbnail_url}
            youtubePip={youtubePip}
            pipEnabled={pipEnabled}
            stickyMode={stickyVideoMode}
            youtubePlayer={youtubePlayer}
            playback={videoPlayback}
            artifactId={a.id}
            moments={moments}
            bookmarkLabel={bookmarkLabel}
            onBookmarkLabelChange={setBookmarkLabel}
            noteBody={noteBody}
            onNoteBodyChange={setNoteBody}
            canCaptureMoments={canCaptureMoments}
            savingMoment={savingMoment}
            hasTranscript={Boolean(a.raw_text?.trim())}
            onBookmark={bookmarkCurrentMoment}
            onSaveNote={addNoteAtCurrentMoment}
            onBelieve={believeCurrentMoment}
            onStudyJournal={openStudyJournal}
            onOpenJournalTimestamp={() => openJournalFromArtifact(getCurrentPlaybackSeconds())}
            onOpenJournalFull={() => openJournalFromArtifact()}
            mobileActiveTab={mobileTab}
            mobileMenuOpen={mobileMenuOpen}
            onMobileMenuOpenChange={stickyVideoMode ? setMobileMenuOpen : undefined}
            menuSections={navSections}
            menuActiveHash={pageSectionHash}
            menuShowPaste={a.kind === "youtube"}
            menuShowWrapUp={a.kind === "youtube" && a.status === "ready"}
            menuShowReanalyze={!inFlight && a.status !== "error"}
            onMenuNavigateSection={navigateToArtifactHash}
            onMenuOpenTranscript={openTranscriptTab}
            onOpenNotesTab={openNotesTabWithNote}
            insightExplorePanel={mobileInsightExplorePanel}
            insightExploreOpen={mobileInsightExploreOpen}
            onMenuPaste={() => setPasteOpen(true)}
            onMenuWrapUp={() => setWrapUpOpen(true)}
            onMenuReanalyze={reanalyze}
            backTo="/framework/artifacts"
            mobileChromeHost={mobileChromeHost}
          />
          )
        ) : null}
        <div
          ref={mobileBodyScrollRef}
          className={cn(
            mobilePinnedPane
              ? cn(
                  artifactMobilePinnedHeaderPadding,
                  artifactMobileDockPadding,
                  "h-full min-h-0 w-full overflow-y-auto overscroll-contain",
                )
              : "contents",
          )}
        >
          {mobilePinnedPane ? <div ref={setMobileChromeHost} className="shrink-0" /> : null}
      {isDesktop || (mobileTab !== "transcript" && mobileTab !== "notes") ? (
        <div className={cn(desktopPremiumYoutube && artifactDesktopBodySheet)}>
        <ArtifactSectionNav
          sections={navSections}
          activeHash={pageSectionHash}
          stickyVideoLayout={false}
          variant={desktopPremiumYoutube ? "desktop" : "default"}
          className={cn(
            !isDesktop && stickyVideoMode && !showMobileOverview && "sticky top-0 z-[28]",
            showMobileOverview && "hidden",
          )}
        />

      {desktopPremiumYoutube && a.status === "ready" ? (
        <ArtifactDesktopOverview
          claims={claims}
          artifactId={a.id}
          artifactStatus={a.status}
          claimsCount={claims.length}
          claimSources={claimSources}
          onNavigate={navigateToArtifactHash}
          onSelectClaim={(claimId) => {
            navigateToArtifactHash("#claims");
            scrollToClaimById(claimId);
          }}
          onSeeScripture={scrollToClaimById}
          onSeeInTranscript={(claimId) => {
            const claim = claims.find((c) => c.id === claimId);
            if (claim) void playClaimAtSource(claim, claimSources[claim.id]);
          }}
        />
      ) : null}
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
        <ArtifactPipelineBanner
          status={a.status}
          kind={a.kind}
          elapsed={elapsed}
          label={stageLabel[a.status] ?? "Working…"}
          hint={stageHint[a.status] ?? ""}
          onPasteTranscript={() => setPasteOpen(true)}
        />
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

      <StudyColumnWrapper className={desktopPremiumYoutube ? "space-y-8" : undefined}>
      {showMobileOverview ? (
        <ArtifactMobileOverview
          claims={claims}
          artifactId={a.id}
          artifactStatus={a.status}
          claimsCount={claims.length}
          entitiesCount={entitiesCount}
          onNavigate={navigateToArtifactHash}
          onSelectClaim={openMobileInsightExplore}
          activeClaimId={mobileInsightExploreClaimId}
          onSeeScripture={openMobileInsightExplore}
        />
      ) : null}
      {desktopPremiumYoutube && a.status === "ready" && claims.length > 0 ? (
        <ArtifactClaimsSection
          anchorId="claims"
          claims={claims}
          claimChapterLayout={claimChapterLayout}
          glossaryEntries={glossaryEntries}
          youTubeVideoId={youTubeVideoId}
          onJumpToClaim={jumpToClaim}
          onSeekChapter={(seconds) => seekVideoToSeconds(seconds, { play: true })}
          claimCardContext={claimCardContext}
          claimsIndexStorageKey={a.id ? `artifact-claims-index:${a.id}` : undefined}
          getClaimSeekSeconds={resolveClaimSeekSeconds}
          playerReady={videoPlayback.playerReady}
          isPlaying={videoPlayback.isPlaying}
          getPlaybackSeconds={getCurrentPlaybackSeconds}
          onTogglePlayback={togglePlayback}
          scrollContainerRef={mainScrollRef}
          onSeeScripture={scrollToClaimById}
          onMarkReviewed={(claimId) => {
            scrollToClaimById(claimId);
            void applyClaimVerdict(claimId, "keep");
          }}
          hideInsightPreview
        />
      ) : null}

      {desktopPremiumYoutube && a.status === "ready" ? (
        <ArtifactCollapsibleSection
          id="entities"
          title="Knowledge entities"
          pinnedVideoPane={mobilePinnedPane}
          description="Full index of people, books, scriptures, and themes."
          defaultOpenMobile={false}
          defaultOpenDesktop={false}
          storageKey={a.id ? `artifact-entities-full:${a.id}` : undefined}
        >
          <ArtifactEntitiesPanel artifactId={a.id} artifactStatus={a.status} variant="default" />
        </ArtifactCollapsibleSection>
      ) : null}

      {!desktopPremiumYoutube && a.kind === "youtube" && a.url ? (
        <ArtifactCollapsibleSection
          title="Chapters"
          pinnedVideoPane={mobilePinnedPane}
          defaultOpenMobile={youtubeChaptersList.length > 0}
          defaultOpenDesktop
          count={youtubeChaptersList.length > 0 ? youtubeChaptersList.length : undefined}
          countLabel={youtubeChaptersList.length > 0 ? `${youtubeChaptersList.length} sections` : undefined}
          storageKey={a.id ? `artifact-chapters:${a.id}` : undefined}
        >
        <ArtifactChaptersSection
          status={a.status}
          rawText={a.raw_text}
          chapters={youtubeChaptersList}
          chaptersSourceLabel={youtubeChaptersSourceLabel}
          generatingChapters={generatingChapters}
          inFlight={inFlight}
          onSyncYouTubeChapters={a.url ? syncYouTubeChapters : undefined}
          syncingYoutubeChapters={syncingYoutubeChapters}
          onGenerateChapters={generateChaptersFromTranscript}
          onSeekChapter={(seconds) => seekVideoToSeconds(seconds, { play: true })}
        />
        </ArtifactCollapsibleSection>
      ) : null}

      {a.kind === "youtube" && a.url && desktopPremiumYoutube ? (
        <ArtifactCollapsibleSection
          title="Chapters"
          pinnedVideoPane={mobilePinnedPane}
          defaultOpenMobile={youtubeChaptersList.length > 0}
          defaultOpenDesktop={false}
          count={youtubeChaptersList.length > 0 ? youtubeChaptersList.length : undefined}
          countLabel={youtubeChaptersList.length > 0 ? `${youtubeChaptersList.length} sections` : undefined}
          storageKey={a.id ? `artifact-chapters:${a.id}` : undefined}
        >
        <ArtifactChaptersSection
          status={a.status}
          rawText={a.raw_text}
          chapters={youtubeChaptersList}
          chaptersSourceLabel={youtubeChaptersSourceLabel}
          generatingChapters={generatingChapters}
          inFlight={inFlight}
          onSyncYouTubeChapters={a.url ? syncYouTubeChapters : undefined}
          syncingYoutubeChapters={syncingYoutubeChapters}
          onGenerateChapters={generateChaptersFromTranscript}
          onSeekChapter={(seconds) => seekVideoToSeconds(seconds, { play: true })}
        />
        </ArtifactCollapsibleSection>
      ) : null}

      {a.kind === "youtube" && a.status === "ready" && youtubeChaptersList.length === 0 && (
        <ArtifactCollapsibleSection
          id="study-spine-teachings"
          pinnedVideoPane={mobilePinnedPane}
          title="Study spine: Teachings"
          description="Extracted invitations from the speaker when no chapter outline exists."
          defaultOpenMobile={false}
          defaultOpenDesktop
          storageKey={a.id ? `artifact-study-spine:${a.id}` : undefined}
        >
          <div
            className={cn(
              isDesktop
                ? "rounded-lg border border-primary/20 bg-primary/[0.04] p-4"
                : cn(artifactPremiumCard, "border-primary/15 p-3"),
            )}
          >
            <p
              className={cn(
                "text-sm leading-relaxed text-muted-foreground",
                isDesktop ? "mb-4" : "mb-3 text-xs",
              )}
            >
              This video has no chapter outline yet, so we lean on extracted{" "}
              <span className="font-medium text-foreground">teachings</span> (what the speaker invites you toward) alongside claims. Generate chapters above for section jumps, or use{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-2 hover:underline"
                onClick={() => navigateToArtifactHash(showMobileOverview ? "#notes" : "#capture")}
              >
                {showMobileOverview ? "Notes" : "Capture"}
              </button>{" "}
              on the Study tab for playhead notes, or bookmark lines in the{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-2 hover:underline"
                onClick={() => navigateToArtifactHash("#transcript")}
              >
                Transcript
              </button>{" "}
              tab while you watch.
            </p>
            <TeachingsPanel artifactId={a.id} artifactStatus={a.status} />
          </div>
        </ArtifactCollapsibleSection>
      )}

      {a.status === "ready" && !(a.kind === "youtube" && youtubeChaptersList.length === 0) && (
        <ArtifactCollapsibleSection
          title="Teachings"
          pinnedVideoPane={mobilePinnedPane}
          defaultOpenMobile={false}
          defaultOpenDesktop
          storageKey={a.id ? `artifact-teachings:${a.id}` : undefined}
        >
          <div className={cn(!isDesktop && artifactPremiumCard, !isDesktop && "p-3")}>
            <TeachingsPanel artifactId={a.id} artifactStatus={a.status} />
          </div>
        </ArtifactCollapsibleSection>
      )}

      {a.status === "ready" && claims.length === 0 && !a.error && (
        <div className="mb-4 rounded border border-border bg-muted/30 p-3 text-sm">
          The transcript came through but no clear claims were extracted. Try Re-analyze, or paste a different excerpt.
        </div>
      )}

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

      {a.status === "ready" && claims.length > 0 && !desktopPremiumYoutube ? (
        <ArtifactCollapsibleSection
          id="claims"
          pinnedVideoPane={mobilePinnedPane}
          title="Claims"
          count={claims.length}
          countLabel={`${claims.length} insights`}
          description={
            isDesktop
              ? "One thesis per card from the transcript — open each to review source, scripture, and verdicts."
              : youTubeVideoId
                ? "Swipe sideways through full claim cards — transcript, scripture, and verdicts on each card."
                : "Swipe insights above, then tap a claim to review source, scripture, and verdicts."
          }
          defaultOpenMobile
          defaultOpenDesktop
          storageKey={a.id ? `artifact-claims-block:${a.id}` : undefined}
        >
          {isDesktop ? (
            <div className={cn(artifactCard, "mb-4 p-4 text-sm leading-relaxed text-muted-foreground")}>
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
          ) : null}
          <ArtifactClaimsSection
            anchorId={undefined}
            claims={claims}
            claimChapterLayout={claimChapterLayout}
            glossaryEntries={glossaryEntries}
            youTubeVideoId={youTubeVideoId}
            onJumpToClaim={jumpToClaim}
            onSeekChapter={(seconds) => seekVideoToSeconds(seconds, { play: true })}
            claimCardContext={claimCardContext}
            mobileOpenClaimId={!isDesktop && !youTubeVideoId ? mobileOpenClaimId : undefined}
            onMobileOpenClaimIdChange={!isDesktop && !youTubeVideoId ? setMobileOpenClaimId : undefined}
            claimsIndexStorageKey={a.id ? `artifact-claims-index:${a.id}` : undefined}
            getClaimSeekSeconds={resolveClaimSeekSeconds}
            playerReady={videoPlayback.playerReady}
            isPlaying={videoPlayback.isPlaying}
            getPlaybackSeconds={getCurrentPlaybackSeconds}
            onTogglePlayback={togglePlayback}
            scrollContainerRef={mobilePinnedPane ? mobileBodyScrollRef : isDesktop ? mainScrollRef : undefined}
            pinnedVideoPane={mobilePinnedPane}
          />
        </ArtifactCollapsibleSection>
      ) : null}

      {a.status === "ready" && !desktopPremiumYoutube ? (
        <ArtifactCollapsibleSection
          id="entities"
          title="People & themes"
          pinnedVideoPane={mobilePinnedPane}
          description="Full index of people, books, scriptures, and themes."
          defaultOpenMobile={false}
          defaultOpenDesktop
          storageKey={a.id ? `artifact-entities:${a.id}` : undefined}
        >
          <ArtifactEntitiesPanel artifactId={a.id} artifactStatus={a.status} variant="default" />
        </ArtifactCollapsibleSection>
      ) : null}
      </StudyColumnWrapper>
        </div>
      ) : null}

      {!isDesktop ? (
        <TabsContent
          value="transcript"
          id="transcript"
          className={cn(
            "mt-0 focus-visible:outline-none data-[state=inactive]:hidden",
            mobilePinnedPane ? cn(artifactMobileDockPadding, "pb-8") : "flex min-h-0 flex-1 flex-col",
          )}
        >
          {transcriptPanel}
        </TabsContent>
      ) : null}

      {!isDesktop && mobilePinnedPane ? (
        <TabsContent
          value="notes"
          className="mt-0 focus-visible:outline-none data-[state=inactive]:hidden"
        >
          <ArtifactMobileNotesTab
            artifactId={a.id}
            bookmarkLabel={bookmarkLabel}
            onBookmarkLabelChange={setBookmarkLabel}
            noteBody={noteBody}
            onNoteBodyChange={setNoteBody}
            moments={moments}
            canCapture={canCaptureMoments}
            saving={savingMoment}
            hasTranscript={Boolean(a.raw_text?.trim())}
            onBookmark={bookmarkCurrentMoment}
            onSaveNote={addNoteAtCurrentMoment}
            onBelieve={believeCurrentMoment}
            onStudyJournal={openStudyJournal}
            onOpenJournalTimestamp={() => openJournalFromArtifact(getCurrentPlaybackSeconds())}
            onOpenJournalFull={() => openJournalFromArtifact()}
            onSeekMoment={(seconds) => seekVideoToSeconds(seconds, { play: true })}
            noteSectionOpen={mobileNoteSectionOpen}
            onNoteSectionOpenChange={setMobileNoteSectionOpen}
          />
        </TabsContent>
      ) : null}
        </div>
        </div>
        </Tabs>

        <aside
          className="hidden min-w-0 lg:col-span-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden lg:py-1 lg:pr-1"
          aria-label="Transcript"
        >
          {transcriptPanel}
        </aside>
      </div>

      {mobilePinnedPane && !mobileInsightExploreOpen ? (
        <MobileAppDock
          activeTab={mobileTab}
          onStudyClick={openStudyTab}
          onTranscriptClick={openTranscriptTab}
          journalActive={floatingJournalOpen}
          onJournalClick={toggleFloatingJournal}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
      ) : null}

      <ArtifactDetailPageDialogs
        pasteOpen={pasteOpen}
        onPasteOpenChange={setPasteOpen}
        pasteText={pasteText}
        onPasteTextChange={setPasteText}
        onPasteTranscriptInput={handlePasteTranscriptInput}
        pasteTimestampsNormalized={pasteTimestampsNormalized}
        normalizedPastePreview={normalizedPastePreview}
        savingPaste={savingPaste}
        onSubmitPasted={submitPasted}
        wrapUpOpen={wrapUpOpen}
        onWrapUpOpenChange={setWrapUpOpen}
        claimsCount={claims.length}
        onWrapUpBackToArtifacts={() => {
          setWrapUpOpen(false);
          toast({ title: "Nice work", description: "Heading back to your artifacts." });
          navigate("/framework/artifacts");
        }}
        polling={polling}
        quickBeliefOpen={quickBeliefOpen}
        onQuickBeliefOpenChange={setQuickBeliefOpen}
        quickBeliefText={quickBeliefText}
        quickBeliefSource={quickBeliefSource}
        quickBeliefInfluence={quickBeliefInfluence}
      />

    </FrameworkLayout>
  );
}
