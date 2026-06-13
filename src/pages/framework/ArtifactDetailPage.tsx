import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2, RefreshCw, FileText, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { BeliefInfluenceAttachment } from "@/lib/framework/quickBelief";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { floatingJournalPlaybackRef } from "@/lib/journal/floatingJournalPlaybackRef";
import { floatingJournalInsertRef } from "@/lib/journal/floatingJournalInsertRef";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";
import ArtifactEntitiesPanel from "@/components/framework/ArtifactEntitiesPanel";
import TeachingsPanel from "@/components/framework/TeachingsPanel";
import { type ClaimsGlossaryEntry } from "@/components/framework/ClaimsGlossary";
import ArtifactCollapsibleSection from "@/components/framework/artifact-detail/ArtifactCollapsibleSection";
import ArtifactDesktopClaimFocus from "@/components/framework/artifact-detail/ArtifactDesktopClaimFocus";
import ArtifactDesktopOverview from "@/components/framework/artifact-detail/ArtifactDesktopOverview";
import ArtifactMobileInsightExploreSlot from "@/components/framework/artifact-detail/ArtifactMobileInsightExploreSlot";
import ArtifactMobileOverview from "@/components/framework/artifact-detail/ArtifactMobileOverview";
import ArtifactDetailLegacyOverviewSummary from "@/components/framework/artifact-detail/ArtifactDetailLegacyOverviewSummary";
import ArtifactLibraryStanding from "@/components/framework/artifact-detail/ArtifactLibraryStanding";
import ArtifactYoutubeMissingVideoCard from "@/components/framework/artifact-detail/ArtifactYoutubeMissingVideoCard";
import ArtifactDetailPageDialogs from "@/components/framework/artifact-detail/ArtifactDetailPageDialogs";
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
import {
  ArtifactDetailDockedJournalPanel,
  ArtifactDetailMobileJournalTabPanel,
} from "@/components/framework/artifact-detail/ArtifactDetailEmbeddedJournalPanels";
import ArtifactDetailMobileTabPanels, {
  ArtifactDetailMobileAppDock,
} from "@/components/framework/artifact-detail/ArtifactDetailMobileTabPanels";
import ArtifactDetailStudyColumnWrapper from "@/components/framework/artifact-detail/ArtifactDetailStudyColumnWrapper";
import ArtifactMobileMenu from "@/components/framework/artifact-detail/ArtifactMobileMenu";
import { buildArtifactDetailTranscriptPanel } from "@/components/framework/artifact-detail/ArtifactDetailTranscriptPanel";
import ArtifactYoutubeVideoBlock from "@/components/framework/artifact-detail/ArtifactYoutubeVideoBlock";
import {
  isArtifactLayoutDesktop,
  isArtifactStickyVideo,
  useArtifactLayoutMode,
} from "@/hooks/useArtifactLayoutMode";
import { useArtifactDetailData } from "@/hooks/useArtifactDetailData";
import { useArtifactDetailProcessingActions } from "@/hooks/useArtifactDetailProcessingActions";
import { useArtifactDetailMobileTabs } from "@/hooks/useArtifactDetailMobileTabs";
import { useArtifactMobileInsightExplore } from "@/hooks/useArtifactMobileInsightExplore";
import { useArtifactEntityCount } from "@/hooks/useArtifactEntityCount";
import {
  startArtifactGlobalVideoHandoff,
  useArtifactGlobalVideoHandoff,
} from "@/hooks/useArtifactGlobalVideoHandoff";
import {
  artifactJournalReturnPath,
  handoffArtifactVideoForJournal,
} from "@/lib/framework/artifactJournalNavigation";
import { useArtifactVideoPlayback } from "@/hooks/useArtifactVideoPlayback";
import {
  artifactCard,
  artifactDesktopBodySheet,
  artifactDesktopSplitPaneCard,
  artifactMobileDockPadding,
  artifactMobileTabScrollPane,
  artifactMobileStudyContentInset,
  artifactScrollMt,
  artifactTeachingsIntroCallout,
  artifactTeachingsShellMobile,
} from "@/lib/framework/artifactSurfaces";
import { getClaimSeekSeconds } from "@/lib/framework/claimPlaybackSync";
import { resolveDesktopPremiumStudyPane } from "@/lib/framework/artifactDesktopStudyPane";
import { scrollMobileInsightPickerIntoView } from "@/lib/framework/scrollMobileInsightPickerIntoView";
import { scrollArtifactClaimIntoView } from "@/lib/framework/scrollArtifactClaimIntoView";
import { ARTIFACT_STUDY_PANE_SELECTOR } from "@/lib/framework/artifactLayoutCss";
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
import {
  buildClaimResearchJournalTitle,
  buildClaimResearchMarkdown,
  findClaimSource,
  formatArtifactKind,
  formatArtifactStatus,
  withYouTubeTimestamp,
} from "@/lib/framework/artifactDetailPageHelpers";
import { fetchLastResearchedAtByClaimIds } from "@/lib/framework/claimResearchRuns";
import { filterSubstantiveClaims } from "@/lib/framework/claimQuality";
import { useArtifactFrameworkOverview } from "@/hooks/useArtifactFrameworkOverview";
import { useArtifactCorpusStanding } from "@/hooks/useArtifactCorpusStanding";
import { useArtifactYoutubeMetaRepair } from "@/hooks/useArtifactYoutubeMetaRepair";

interface ArtifactMetadata {
  source?: string;
  channel_title?: string | null;
  channel_url?: string | null;
  channel_thumbnail_url?: string | null;
  author_name?: string | null;
  author?: string | null;
  thumbnail_url?: string | null;
  provider_name?: string | null;
  duration_seconds?: number | null;
  title?: string;
  youtube_chapters?: YoutubeChapter[];
  youtube_chapters_source?: string | null;
  video_id?: string;
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
  const { liveMeta, setLiveMeta, fetchYouTubeMeta, repairedRef } = useArtifactYoutubeMetaRepair(a, setA);
  const [refreshingMeta, setRefreshingMeta] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [savingMoment, setSavingMoment] = useState(false);
  const [quickBeliefOpen, setQuickBeliefOpen] = useState(false);
  const [quickBeliefText, setQuickBeliefText] = useState("");
  const [quickBeliefSource, setQuickBeliefSource] = useState("");
  const [wrapUpOpen, setWrapUpOpen] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const transcriptAsideRef = useRef<HTMLElement | null>(null);
  const mobileBodyScrollRef = useRef<HTMLDivElement | null>(null);
  const [mobileChromeHost, setMobileChromeHost] = useState<HTMLDivElement | null>(null);
  const transcriptRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastBookmarkJournalInsertAtRef = useRef(0);
  const [syncingYoutubeChapters, setSyncingYoutubeChapters] = useState(false);
  const [generatingChapters, setGeneratingChapters] = useState(false);
  const [pageSectionHash, setPageSectionHash] = useState(() =>
    typeof window !== "undefined" ? window.location.hash : "",
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const floatingJournalOpen = useFloatingJournalStore((s) => s.panelOpen);
  const artifactJournalMode = useFloatingJournalStore((s) => s.artifactJournalMode);
  const artifactJournalOpen = artifactJournalMode !== "closed";
  const artifactJournalExpanded = artifactJournalMode === "expanded";
  const { mobileTab, onTabChange, openStudyTab, openTranscriptTab, openNotesTab, openJournalTab } =
    useArtifactDetailMobileTabs();
  const entitiesCount = useArtifactEntityCount(a?.id, a?.status);
  const [mobileOpenClaimId, setMobileOpenClaimId] = useState<string | null>(null);
  const [lastResearchedAtByClaim, setLastResearchedAtByClaim] = useState<Record<string, string>>({});
  const [desktopInsightExploreClaimId, setDesktopInsightExploreClaimId] = useState<string | null>(null);
  const [mobileNoteSectionOpen, setMobileNoteSectionOpen] = useState(false);
  const resetMobileStudyScroll = useCallback(() => {
    scrollMobileInsightPickerIntoView(mobileBodyScrollRef.current);
  }, []);
  const {
    mobileInsightExploreClaimId,
    setMobileInsightExploreClaimId,
    closeMobileInsightExplore,
  } = useArtifactMobileInsightExplore(mobileTab, resetMobileStudyScroll);

  const layoutMode = useArtifactLayoutMode();
  const isDesktop = isArtifactLayoutDesktop(layoutMode);

  useEffect(() => {
    const sync = () => setPageSectionHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

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

  const frameworkOverview = useArtifactFrameworkOverview(a?.metadata);

  const studyClaims = useMemo(() => {
    const duration =
      mergedVideoMeta.duration_seconds ?? artifactMetadata.duration_seconds ?? null;
    const seekCtx = { transcriptSegments, videoDurationSeconds: duration };
    const substantive = filterSubstantiveClaims(claims);
    return [...substantive].sort((left, right) => {
      const leftSeek = getClaimSeekSeconds(left, claimSources[left.id], seekCtx);
      const rightSeek = getClaimSeekSeconds(right, claimSources[right.id], seekCtx);
      const leftKey = leftSeek ?? left.chapter_start_seconds ?? Number.MAX_SAFE_INTEGER;
      const rightKey = rightSeek ?? right.chapter_start_seconds ?? Number.MAX_SAFE_INTEGER;
      if (leftKey !== rightKey) return leftKey - rightKey;
      return left.claim.localeCompare(right.claim);
    });
  }, [claims, claimSources, transcriptSegments, mergedVideoMeta.duration_seconds, artifactMetadata.duration_seconds]);

  const claimBeliefCounts = useMemo(() => {
    let agree = 0;
    let disagree = 0;
    let newCount = 0;
    for (const c of studyClaims) {
      if (c.match_relation === "agree") agree += 1;
      else if (c.match_relation === "disagree") disagree += 1;
      else newCount += 1;
    }
    return { agree, disagree, new: newCount };
  }, [studyClaims]);

  const insightsVisible =
    a?.status === "ready" || (a?.status === "analyzing" && studyClaims.length > 0);

  const corpusStandingQuery = useArtifactCorpusStanding(
    a?.id,
    a?.status,
    studyClaims.length,
    user?.id,
    insightsVisible,
  );

  const corpusStanding = useMemo(
    () => ({
      agreeCount: claimBeliefCounts.agree,
      disagreeCount: claimBeliefCounts.disagree,
      newCount: claimBeliefCounts.new,
      peerLibraryCount: corpusStandingQuery.peerLibraryCount,
      peers: corpusStandingQuery.peers,
      echoClaimCount: corpusStandingQuery.echoClaimCount,
      loading: corpusStandingQuery.loading,
      error: corpusStandingQuery.error,
      embeddingPending: corpusStandingQuery.embeddingPending,
      onReload: corpusStandingQuery.reload,
    }),
    [claimBeliefCounts, corpusStandingQuery],
  );

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
    () => groupClaimsUnderYoutubeChapters(studyClaims, claimSources, youtubeChaptersList),
    [studyClaims, claimSources, youtubeChaptersList],
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
    videoTitle: a?.title ?? null,
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
    getIsPlaying,
    getWantsContinuousPlayback,
    persistSeconds,
    togglePlayback,
    resyncPlaybackPosition,
  } = videoPlayback;

  useArtifactGlobalVideoHandoff({
    artifactId: id,
    youTubeVideoId,
    title: a?.title ?? null,
    getPlaybackSeconds,
    getWantsContinuousPlayback,
    persistSeconds,
    pipLayout: youtubePip.pipOverlayLayout,
  });

  useEffect(() => {
    if (!isDesktop && mobileTab === "transcript" && youTubeVideoId) {
      resyncPlaybackPosition();
    }
  }, [isDesktop, mobileTab, resyncPlaybackPosition, youTubeVideoId]);

  useEffect(() => {
    if (!a?.id) {
      useFloatingJournalStore.getState().setRouteArtifact(null);
      return;
    }
    useFloatingJournalStore.getState().setRouteArtifact({
      id: a.id,
      title: a.title || "Untitled artifact",
      kind: a.kind,
      youTubeVideoId: youTubeVideoId ?? null,
    });
    return () => {
      useFloatingJournalStore.getState().setRouteArtifact(null);
      useFloatingJournalStore.getState().setArtifactJournalMode("closed");
    };
  }, [a?.id, a?.title, a?.kind, youTubeVideoId]);

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
      studyClaims.map((c, i) => ({
        id: c.id,
        claim: c.claim,
        verdict: c.verdict,
        number: i + 1,
      })),
    [studyClaims],
  );

  const deferredOnArtifact = useMemo(
    () => studyClaims.filter((c) => isDeferredVerdict(c.verdict)).length,
    [studyClaims],
  );

  const desktopPremiumYoutube = isDesktop && a?.kind === "youtube" && Boolean(youTubeVideoId);
  const desktopPremiumStudyPane = useMemo(
    () => (desktopPremiumYoutube ? resolveDesktopPremiumStudyPane(pageSectionHash) : null),
    [desktopPremiumYoutube, pageSectionHash],
  );
  const showDesktopOverviewPane = desktopPremiumStudyPane === "overview";
  const showDesktopClaimsPane = desktopPremiumStudyPane === "claims";
  const claimsHorizontalRail = desktopPremiumYoutube || (!isDesktop && Boolean(youTubeVideoId));

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || !studyClaims.some((c) => c.id === hash)) return;
    const t = window.setTimeout(() => {
      scrollArtifactClaimIntoView(document.getElementById(hash), {
        horizontalRail: claimsHorizontalRail,
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [studyClaims, a?.status, claimsHorizontalRail]);

  const scrollToVideoSection = useCallback(() => {
    document.getElementById("video")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const getCurrentPlaybackSeconds = getPlaybackSeconds;

  const videoDurationSeconds =
    mergedVideoMeta.duration_seconds ?? artifactMetadata.duration_seconds ?? null;

  const claimSeekContext = useMemo(
    () => ({ transcriptSegments, videoDurationSeconds }),
    [transcriptSegments, videoDurationSeconds],
  );

  const resolveClaimSeekSeconds = useCallback(
    (claim: Claim) => getClaimSeekSeconds(claim, claimSources[claim.id], claimSeekContext),
    [claimSources, claimSeekContext],
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
    if (a.url && youtubeChaptersList.length > 0) {
      sections.push({ id: "chapters", hash: "#chapters", label: "Chapters" });
    }
    if (a.kind === "youtube" && youtubeChaptersList.length === 0) {
      sections.push({ id: "teachings", hash: "#study-spine-teachings", label: "Teachings" });
    }
    const pinnedMobileYoutube =
      !isDesktop && isArtifactStickyVideo(layoutMode, Boolean(youTubeVideoId));
    if (studyClaims.length > 0) {
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
    studyClaims.length,
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
      const idx = studyClaims.findIndex((c) => c.id === currentId);
      const next = idx >= 0 ? studyClaims[idx + 1] : undefined;
      if (!next) {
        setMobileOpenClaimId(null);
        return;
      }
      setMobileOpenClaimId(next.id);
      window.requestAnimationFrame(() => {
        document.getElementById(next.id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    },
    [studyClaims, isDesktop],
  );

  useEffect(() => {
    if (isDesktop || studyClaims.length === 0) return;
    setMobileOpenClaimId((prev) => {
      if (prev && studyClaims.some((c) => c.id === prev)) return prev;
      return studyClaims[0]?.id ?? null;
    });
  }, [studyClaims, isDesktop]);

  const focusTranscriptSegment = useCallback(
    (segment: TranscriptSegment | null | undefined, opts?: { deferMs?: number }) => {
      if (!segment || segment.isParagraphBreak) return;
      const scroll = () => {
        transcriptRefs.current[segment.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      };
      if (opts?.deferMs != null && opts.deferMs > 0) {
        window.setTimeout(scroll, opts.deferMs);
        return;
      }
      scroll();
    },
    [],
  );

  const playClaimAtSource = useCallback(
    (claim: Claim, source: TranscriptSegment | null | undefined) => {
      const seconds = getClaimSeekSeconds(claim, source ?? null, claimSeekContext);
      const canPlay = seconds != null || source?.startSeconds != null;

      if (canPlay) {
        const seekTo = seconds ?? Math.max(0, Math.floor(source!.startSeconds!));
        seekVideoToSeconds(seekTo, { play: true, scrollTranscript: false });
        return;
      }

      // No timestamp — "Jump to transcript" fallback only.
      if (!isDesktop) openTranscriptTab();
      focusTranscriptSegment(source ?? null, !isDesktop ? { deferMs: 100 } : undefined);
      scrollToClaimById(claim.id);
    },
    [
      claimSeekContext,
      focusTranscriptSegment,
      isDesktop,
      openTranscriptTab,
      scrollToClaimById,
      seekVideoToSeconds,
    ],
  );

  const seeClaimInTranscript = useCallback(
    (claimId: string) => {
      const claim = claims.find((c) => c.id === claimId);
      if (!claim) return;
      const source = claimSources[claim.id];
      if (!isDesktop) openTranscriptTab();
      focusTranscriptSegment(source ?? null, !isDesktop ? { deferMs: 100 } : undefined);
      const seconds = getClaimSeekSeconds(claim, source ?? null, claimSeekContext);
      if (seconds != null) {
        seekVideoToSeconds(seconds, { play: true });
        return;
      }
      scrollToClaimById(claim.id);
      if (source?.startSeconds != null) {
        seekVideoToSeconds(source.startSeconds, { play: true });
      }
    },
    [
      claimSeekContext,
      claimSources,
      claims,
      focusTranscriptSegment,
      isDesktop,
      openTranscriptTab,
      scrollToClaimById,
      seekVideoToSeconds,
    ],
  );

  const openDesktopInsightExplore = useCallback((claimId: string) => {
    setDesktopInsightExploreClaimId(claimId);
  }, []);

  const closeDesktopInsightExplore = useCallback(() => {
    setDesktopInsightExploreClaimId(null);
  }, []);

  useEffect(() => {
    if (desktopPremiumStudyPane !== "overview") {
      setDesktopInsightExploreClaimId(null);
    }
  }, [desktopPremiumStudyPane]);

  const openArtifactJournal = useCallback(
    (mode: "docked" | "expanded" = "docked") => {
      const store = useFloatingJournalStore.getState();
      store.setFloatingClaimResearch(null);
      store.setPanelOpen(false);
      store.setArtifactJournalMode(mode);
      if (!isDesktop) {
        if (isArtifactStickyVideo(layoutMode, Boolean(youTubeVideoId))) openJournalTab();
        else openStudyTab();
      }
      if (mode === "expanded" && pipEnabled) {
        youtubePip.enterPip();
      }
    },
    [isDesktop, layoutMode, openJournalTab, openStudyTab, pipEnabled, youTubeVideoId, youtubePip],
  );

  const closeArtifactJournal = useCallback(() => {
    const wasExpanded = useFloatingJournalStore.getState().artifactJournalMode === "expanded";
    useFloatingJournalStore.getState().setArtifactJournalMode("closed");
    if (wasExpanded && youtubePip.pipMode) {
      youtubePip.scrollVideoIntoView();
    }
  }, [youtubePip]);

  const openMobileJournalTab = useCallback(() => {
    useFloatingJournalStore.getState().setFloatingClaimResearch(null);
    useFloatingJournalStore.getState().setPanelOpen(false);
    useFloatingJournalStore.getState().setArtifactJournalMode("docked");
    openJournalTab();
  }, [openJournalTab]);

  const leaveMobileJournalTab = useCallback(() => {
    closeArtifactJournal();
  }, [closeArtifactJournal]);

  const expandArtifactJournal = useCallback(() => {
    openArtifactJournal("expanded");
  }, [openArtifactJournal]);

  const dockArtifactJournal = useCallback(() => {
    useFloatingJournalStore.getState().setArtifactJournalMode("docked");
    if (youtubePip.pipMode) {
      youtubePip.scrollVideoIntoView();
    }
  }, [youtubePip]);

  const handleRestoreFromPip = useCallback(() => {
    youtubePip.scrollVideoIntoView();
    if (useFloatingJournalStore.getState().artifactJournalMode === "expanded") {
      useFloatingJournalStore.getState().setArtifactJournalMode("docked");
    }
  }, [youtubePip]);

  useEffect(() => {
    if (artifactJournalMode === "expanded" && pipEnabled && !youtubePip.pipMode) {
      youtubePip.enterPip();
    }
  }, [artifactJournalMode, pipEnabled, youtubePip]);

  const stickyVideoMode = isArtifactStickyVideo(layoutMode, Boolean(youTubeVideoId));
  const mobilePinnedPane = !isDesktop && stickyVideoMode;
  const desktopStudyDock = Boolean(isDesktop && desktopPremiumYoutube);
  const showArtifactAppDock = mobilePinnedPane || desktopStudyDock;
  const artifactInsightExploreOpen =
    Boolean(mobilePinnedPane && mobileInsightExploreClaimId) || Boolean(desktopInsightExploreClaimId);

  useEffect(() => {
    if (window.location.hash !== "#journal") return;
    if (isDesktop) openArtifactJournal("docked");
    else if (mobilePinnedPane) openMobileJournalTab();
  }, [id, isDesktop, mobilePinnedPane, openArtifactJournal, openMobileJournalTab]);

  const switchToStudyTab = useCallback(() => {
    if (mobilePinnedPane && mobileTab === "journal") leaveMobileJournalTab();
    if (desktopInsightExploreClaimId) setDesktopInsightExploreClaimId(null);
    openStudyTab();
  }, [
    desktopInsightExploreClaimId,
    leaveMobileJournalTab,
    mobilePinnedPane,
    mobileTab,
    openStudyTab,
  ]);

  const handleDockJournalClick = useCallback(() => {
    if (desktopStudyDock) {
      openArtifactJournal("docked");
      openJournalTab();
      return;
    }
    openMobileJournalTab();
  }, [desktopStudyDock, openArtifactJournal, openJournalTab, openMobileJournalTab]);

  const handleDockTranscriptClick = useCallback(() => {
    if (mobilePinnedPane && mobileTab === "journal") leaveMobileJournalTab();
    openTranscriptTab();
    if (desktopStudyDock) {
      transcriptAsideRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [desktopStudyDock, leaveMobileJournalTab, mobilePinnedPane, mobileTab, openTranscriptTab]);

  const switchToTranscriptTab = useCallback(() => {
    if (mobilePinnedPane && mobileTab === "journal") leaveMobileJournalTab();
    openTranscriptTab();
  }, [leaveMobileJournalTab, mobilePinnedPane, mobileTab, openTranscriptTab]);

  const switchToNotesTab = useCallback(() => {
    if (mobilePinnedPane && mobileTab === "journal") leaveMobileJournalTab();
    openNotesTab();
  }, [leaveMobileJournalTab, mobilePinnedPane, mobileTab, openNotesTab]);

  const openNotesTabWithNote = useCallback(() => {
    setMobileNoteSectionOpen(true);
    switchToNotesTab();
  }, [switchToNotesTab]);

  const openMobileInsightExplore = useCallback(
    (claimId: string) => {
      switchToStudyTab();
      setMobileInsightExploreClaimId(claimId);
    },
    [setMobileInsightExploreClaimId, switchToStudyTab],
  );

  const handleMobileTabChange = useCallback(
    (value: string) => {
      if (mobilePinnedPane && value === "journal") {
        openMobileJournalTab();
        return;
      }
      if (mobilePinnedPane && mobileTab === "journal") leaveMobileJournalTab();
      onTabChange(value);
    },
    [leaveMobileJournalTab, mobilePinnedPane, mobileTab, onTabChange, openMobileJournalTab],
  );

  const navigateToArtifactHash = useCallback(
    (hash: string) => {
      const sectionId = hash.replace(/^#/, "");
      if (!sectionId) return;
      if (sectionId === "transcript") {
        switchToTranscriptTab();
        return;
      }
      if (sectionId === "notes" || sectionId === "capture") {
        switchToNotesTab();
        return;
      }
      switchToStudyTab();
      window.location.hash = sectionId;
      window.requestAnimationFrame(() => {
        scrollArtifactClaimIntoView(document.getElementById(sectionId));
      });
    },
    [switchToStudyTab, switchToTranscriptTab, switchToNotesTab],
  );

  useEffect(() => {
    if (!user?.id || !claims.length) {
      setLastResearchedAtByClaim({});
      return;
    }
    let cancelled = false;
    void fetchLastResearchedAtByClaimIds(
      supabase,
      user.id,
      claims.map((c) => c.id),
    ).then((map) => {
      if (!cancelled) setLastResearchedAtByClaim(map);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, claims]);

  const claimVerdictRevision = useFloatingJournalStore((s) => s.claimVerdictRevision);
  const lastClaimVerdictPatch = useFloatingJournalStore((s) => s.lastClaimVerdictPatch);

  useEffect(() => {
    if (!a?.id || !lastClaimVerdictPatch) return;
    if (lastClaimVerdictPatch.artifactId !== a.id) return;
    setClaims((cs) =>
      cs.map((c) =>
        c.id === lastClaimVerdictPatch.claimId
          ? {
              ...c,
              verdict: lastClaimVerdictPatch.verdict,
              deferred_at: lastClaimVerdictPatch.deferred_at,
            }
          : c,
      ),
    );
  }, [a?.id, claimVerdictRevision, lastClaimVerdictPatch]);

  const {
    reanalyze,
    formatTranscript,
    syncYouTubeChapters,
    generateChaptersFromTranscript,
    retryFetch,
    retryingFetch,
    submitPasted,
  } = useArtifactDetailProcessingActions({
    a,
    setA,
    setClaims,
    transcriptNeedsFormatting,
    patchArtifactMetadata,
    pasteText,
    setPasteOpen,
    setSavingPaste,
    setFormattingTranscript,
    setSyncingYoutubeChapters,
    setGeneratingChapters,
  });

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
    if (a?.id) {
      useFloatingJournalStore.getState().publishClaimVerdictPatch({
        artifactId: a.id,
        claimId: cid,
        verdict,
        deferred_at,
      });
    }
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
    const claim = studyClaims[claimNumber - 1];
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
  const claimsDigest = studyClaims.map((c, i) => `${i + 1}. ${c.claim}`).join("\n");
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
    const returnTo = artifactJournalReturnPath(a.id);
    if (youTubeVideoId) {
      handoffArtifactVideoForJournal({
        artifactId: a.id,
        youTubeVideoId,
        title: a.title ?? null,
        getPlaybackSeconds,
        getIsPlaying,
        persistSeconds,
        pipLayout: youtubePip.pipOverlayLayout,
      });
    }
    const qs = new URLSearchParams();
    qs.set("returnTo", encodeURIComponent(returnTo));
    if (a.title) qs.set("artifactTitle", encodeURIComponent(a.title));
    if (a.url) qs.set("artifactUrl", encodeURIComponent(startSeconds == null ? a.url : withYouTubeTimestamp(a.url, startSeconds)));
    if (displayTranscriptText) qs.set("artifactTranscript", encodeURIComponent(displayTranscriptText.slice(0, 12000)));
    if (claimsDigest) qs.set("artifactClaims", encodeURIComponent(claimsDigest.slice(0, 6000)));
    if (startSeconds != null) qs.set("artifactTime", String(Math.max(0, Math.floor(startSeconds))));
    navigate(`/journal/new?${qs.toString()}`);
  };

  const openJournalFromClaim = (claim: Claim, startSeconds?: number) => {
    const returnTo = artifactJournalReturnPath(a.id);
    if (youTubeVideoId) {
      handoffArtifactVideoForJournal({
        artifactId: a.id,
        youTubeVideoId,
        title: a.title ?? null,
        getPlaybackSeconds,
        getIsPlaying,
        persistSeconds,
        pipLayout: youtubePip.pipOverlayLayout,
      });
    }
    const qs = new URLSearchParams();
    qs.set("returnTo", encodeURIComponent(returnTo));
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
    const handoff = {
      claimId: claim.id,
      artifactId: a.id,
      claimMarkdown: markdown,
      journalTitle: buildClaimResearchJournalTitle(a.title, claim),
      transcriptExcerpt: source?.text ? source.text.slice(0, 4000) : undefined,
      initialTab: "chat" as const,
      claimPreview: claim.claim.trim().slice(0, 220) || "Claim",
      matchedBeliefId: claim.matched_belief_id,
      artifactTitle: a.title,
    };
    if (!isDesktop) {
      if (getWantsContinuousPlayback() && youTubeVideoId && id) {
        const seconds = getPlaybackSeconds();
        persistSeconds(seconds);
        startArtifactGlobalVideoHandoff({
          artifactId: id,
          youTubeVideoId,
          title: a.title,
          startSeconds: seconds,
          layout: youtubePip.pipOverlayLayout,
        });
      }
      useFloatingJournalStore.getState().setFloatingClaimResearch(handoff);
      navigate(`/framework/artifacts/${a.id}/research/${claim.id}`);
      return;
    }
    useFloatingJournalStore.getState().setFloatingClaimResearch(handoff);
    useFloatingJournalStore.getState().setArtifactJournalMode("closed");
    useFloatingJournalStore.getState().setPanelOpen(true);
    if (getWantsContinuousPlayback() && pipEnabled) {
      youtubePip.enterPip();
    }
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
    const journalOpen =
      useFloatingJournalStore.getState().panelOpen ||
      useFloatingJournalStore.getState().artifactJournalMode !== "closed";
    if (insertTarget?.artifactId === a.id && routeId === a.id && journalOpen) {
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
    const inlineJournal = useFloatingJournalStore.getState().artifactJournalMode !== "closed";
    const routeId = useFloatingJournalStore.getState().routeArtifact?.id;
    const insertTarget = floatingJournalInsertRef.current;
    const journalTied =
      (panelOpen || inlineJournal) &&
      routeId === a.id &&
      insertTarget?.artifactId === a.id &&
      a.kind === "youtube";

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

  const openStudyJournal = () => openArtifactJournal("docked");

  const claimCardContext: RenderClaimCardContext = {
    isDesktop,
    youTubeVideoId,
    claimSources,
    transcriptSegments,
    videoDurationSeconds,
    matchedBeliefs,
    lastResearchedAtByClaim,
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
    fetching:
      "Pulling captions from YouTube (or our transcript service). If nothing happens in ~20s, this page retries automatically.",
    transcribing: "Converting your audio to text. Usually 10–30 seconds.",
    analyzing: "Insight cards usually appear in 30–60 seconds. People, themes, and overview fill in shortly after.",
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

  const journalPanelProps =
    user
      ? {
          userId: user.id,
          artifactId: a.id,
          artifactTitle: displayTitle,
          artifactKind: a.kind,
          channel: mergedVideoMeta.channel_title,
          channelUrl: mergedVideoMeta.channel_url,
          author: mergedVideoMeta.author_name ?? mergedVideoMeta.author ?? null,
          thumbnailUrl: mergedVideoMeta.thumbnail_url,
          youTubeVideoId: youTubeVideoId ?? null,
          providerName: mergedVideoMeta.provider_name,
          getPlaybackSeconds: canCapturePlaybackForJournal ? getPlaybackSeconds : undefined,
          transcriptSegments,
          onSeekPlayback: (seconds: number) => seekVideoToSeconds(seconds, { play: true }),
          artifactJournalExpanded,
          onExpand: expandArtifactJournal,
          onDock: dockArtifactJournal,
        }
      : null;

  const embeddedJournalPanel =
    journalPanelProps && artifactJournalOpen && !mobilePinnedPane ? (
      <ArtifactDetailDockedJournalPanel {...journalPanelProps} onClose={closeArtifactJournal} />
    ) : null;

  const mobileJournalTabPanel =
    journalPanelProps && mobilePinnedPane ? (
      <ArtifactDetailMobileJournalTabPanel {...journalPanelProps} onClose={switchToStudyTab} />
    ) : null;

  const showMobileOverview = mobilePinnedPane && a.status === "ready";
  const mobileInsightExploreOpen = Boolean(mobilePinnedPane && mobileInsightExploreClaimId);
  const mobileInsightExplorePanel = (
    <ArtifactMobileInsightExploreSlot
      enabled={mobilePinnedPane && mobileTab === "study"}
      claimId={mobileInsightExploreClaimId}
      claims={studyClaims}
      claimCardContext={claimCardContext}
      onBack={closeMobileInsightExplore}
      onSelectClaim={openMobileInsightExplore}
    />
  );

  const transcriptPanel = a.raw_text
    ? buildArtifactDetailTranscriptPanel({
        artifactId: a.id,
        segments: transcriptSegments,
        timed: transcriptTimedLayout,
        coarseTimestampsOnly: transcriptCoarseOnly,
        youTubeVideoId,
        playerReady: videoPlayback.playerReady,
        isPlaying: videoPlayback.isPlaying,
        togglePlayback,
        getCurrentPlaybackSeconds,
        seekVideoToSeconds,
        canCaptureMoments,
        savingMoment,
        copyTranscript,
        openJournalFromArtifact,
        artifactKind: a.kind,
        artifactUrl: a.url,
        retryFetch,
        inFlight,
        transcriptRefs,
        transcriptNeedsFormatting,
        formattingTranscript,
        formatTranscript,
        isDesktop,
        desktopPremiumYoutube,
        setPlaybackRate: youtubePlayer.setPlaybackRate,
        getIsPlaying: videoPlayback.getIsPlaying,
        pauseVideo: videoPlayback.pauseVideo,
        playVideo: videoPlayback.playVideo,
        bookmarkAtSeconds,
        journalTranscriptSegment,
        researchLaterTranscriptSegment,
        noteBody,
        onNoteBodyChange: setNoteBody,
        artifactPolishKey: a.id,
        saveSegmentNote,
        mobileTab,
        moments,
      })
    : null;

  const desktopPremiumVideoShell =
    desktopPremiumYoutube && youTubeVideoId ? (
      <ArtifactDetailDesktopShell
        videoSlotRef={youtubePip.videoSlotRef}
        hero={{
          displayTitle,
          statusLabel: formatArtifactStatus(a.status),
          inFlight,
          channel: mergedVideoMeta.channel_title,
          channelUrl: mergedVideoMeta.channel_url,
          channelThumbnailUrl: mergedVideoMeta.channel_thumbnail_url,
          thumbnailUrl: mergedVideoMeta.thumbnail_url,
          youTubeVideoId,
          durationSeconds: mergedVideoMeta.duration_seconds ?? artifactMetadata.duration_seconds,
          createdAt: a.created_at,
          isPlaying: videoPlayback.isPlaying,
          onTogglePlay: () => {
            if (videoPlayback.playerReady) togglePlayback();
            else videoPlayback.activateAndPlay();
          },
          onAddNote: () => navigateToArtifactHash("#capture"),
          showPaste: a.kind === "youtube",
          showWrapUp: a.kind === "youtube" && a.status === "ready",
          showReanalyze: !inFlight && a.status !== "error",
          onPasteTranscript: () => setPasteOpen(true),
          onWrapUp: () => setWrapUpOpen(true),
          onReanalyze: reanalyze,
          videoInPip: youtubePip.pipMode || artifactJournalExpanded,
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
            onScrollVideoIntoView={handleRestoreFromPip}
          />
        }
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
          "space-y-6",
          desktopPremiumYoutube && "lg:p-4",
          "lg:grid lg:min-h-0 lg:grid-cols-12 lg:items-stretch lg:gap-4",
          artifactSplitPaneHeightClass,
          mobilePinnedPane && "flex min-h-0 flex-1 flex-col space-y-0 overflow-x-visible overflow-y-hidden",
        )}
      >
        <Tabs
          value={mobileTab}
          onValueChange={handleMobileTabChange}
          data-artifact-study-pane={showArtifactAppDock ? "" : undefined}
          className={cn(
            "min-w-0 lg:col-span-8 lg:flex lg:h-full lg:min-h-0 lg:flex-col",
            showArtifactAppDock && "relative",
            mobilePinnedPane && "flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col overflow-x-visible overflow-y-hidden",
          )}
        >
        <div
          className={cn(
            "min-w-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col",
            mobilePinnedPane && "flex min-h-0 flex-1 flex-col",
            desktopPremiumYoutube && artifactDesktopSplitPaneCard,
          )}
        >
        <div
          ref={mainScrollRef}
          className={cn(
            "min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:scrollbar-hover-thin",
            desktopStudyDock && artifactMobileDockPadding,
            mobilePinnedPane
              ? cn(
                  "flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col overflow-hidden",
                  mobileTab === "journal" && "overflow-hidden",
                )
              : desktopPremiumYoutube
                ? "space-y-3"
                : "space-y-5 sm:space-y-6",
          )}
        >
        {desktopPremiumVideoShell}
        {youTubeVideoId && !desktopPremiumYoutube ? (
          <ArtifactYoutubeVideoBlock
            youTubeVideoId={youTubeVideoId}
            displayTitle={stickyVideoMode ? displayTitle : undefined}
            channel={stickyVideoMode ? mergedVideoMeta.channel_title : undefined}
            channelUrl={stickyVideoMode ? mergedVideoMeta.channel_url : undefined}
            channelThumbnailUrl={stickyVideoMode ? mergedVideoMeta.channel_thumbnail_url : undefined}
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
            onMenuOpenTranscript={switchToTranscriptTab}
            onOpenNotesTab={openNotesTabWithNote}
            insightExplorePanel={mobileInsightExplorePanel}
            insightExploreOpen={mobileInsightExploreOpen}
            onMenuPaste={() => setPasteOpen(true)}
            onMenuWrapUp={() => setWrapUpOpen(true)}
            onMenuReanalyze={reanalyze}
            backTo="/framework/artifacts"
            mobileChromeHost={mobileChromeHost}
            onScrollVideoIntoView={handleRestoreFromPip}
          />
        ) : null}
        {embeddedJournalPanel && !mobilePinnedPane ? embeddedJournalPanel : null}
        <div
          ref={mobileBodyScrollRef}
          className={cn(
            mobilePinnedPane
              ? cn(
                  mobileTab !== "study" && "hidden",
                  mobileTab === "journal" || mobileInsightExploreOpen
                    ? "flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col overflow-hidden"
                    : artifactMobileTabScrollPane,
                )
              : "contents",
          )}
        >
          {mobilePinnedPane ? <div ref={setMobileChromeHost} className="shrink-0" /> : null}
      {!artifactJournalExpanded &&
      (isDesktop ||
        (mobileTab !== "transcript" && mobileTab !== "notes" && mobileTab !== "journal")) ? (
        <div className={cn(desktopPremiumYoutube && artifactDesktopBodySheet)}>
        <ArtifactSectionNav
          sections={navSections}
          activeHash={pageSectionHash}
          stickyVideoLayout={false}
          variant={desktopPremiumYoutube ? "desktop" : "default"}
          className={cn(
            !isDesktop && !desktopPremiumYoutube && artifactMobileStudyContentInset,
            !isDesktop && stickyVideoMode && !showMobileOverview && "sticky top-0 z-[28]",
            showMobileOverview && "hidden",
          )}
        />

      {showDesktopOverviewPane && desktopPremiumYoutube && insightsVisible ? (
        desktopInsightExploreClaimId ? (
          <ArtifactDesktopClaimFocus
            claimId={desktopInsightExploreClaimId}
            claims={studyClaims}
            claimCardContext={claimCardContext}
            onBack={closeDesktopInsightExplore}
            onSelectClaim={openDesktopInsightExplore}
          />
        ) : (
          <ArtifactDesktopOverview
            claims={studyClaims}
            artifactId={a.id}
            artifactStatus={a.status}
            artifactMetadata={mergedVideoMeta}
            claimsCount={studyClaims.length}
            frameworkOverview={frameworkOverview}
            claimSources={claimSources}
            corpusStanding={corpusStanding}
            onNavigate={navigateToArtifactHash}
            onSelectClaim={openDesktopInsightExplore}
            onSeeScripture={openDesktopInsightExplore}
            onSeeInTranscript={seeClaimInTranscript}
          />
        )
      ) : null}
      {a.kind === "youtube" && !youTubeVideoId ? (
        <ArtifactYoutubeMissingVideoCard
          artifact={a}
          artifactMetadata={artifactMetadata}
          liveMeta={liveMeta}
          refreshingMeta={refreshingMeta}
          setRefreshingMeta={setRefreshingMeta}
          setLiveMeta={setLiveMeta}
          setA={setA}
          fetchYouTubeMeta={fetchYouTubeMeta}
          repairedRef={repairedRef}
        />
      ) : null}

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
            {a.raw_text?.trim() && (
              <Button size="sm" variant="outline" disabled={inFlight} onClick={() => void reanalyze()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-analyze
              </Button>
            )}
            {a.kind === "youtube" && a.url && (
              <Button size="sm" variant="outline" disabled={retryingFetch || inFlight} onClick={() => void retryFetch()}>
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1", retryingFetch && "animate-spin")} />{" "}
                {retryingFetch ? "Fetching…" : "Try fetch again"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}>
              <FileText className="w-3.5 h-3.5 mr-1" /> Paste transcript
            </Button>
          </div>
        </div>
      )}

      <ArtifactDetailStudyColumnWrapper
        isDesktop={isDesktop}
        className={desktopPremiumYoutube ? "space-y-8" : undefined}
      >
      {showMobileOverview ? (
        <ArtifactMobileOverview
          claims={studyClaims}
          artifactId={a.id}
          artifactStatus={a.status}
          artifactMetadata={mergedVideoMeta}
          claimsCount={studyClaims.length}
          entitiesCount={entitiesCount}
          frameworkOverview={frameworkOverview}
          corpusStanding={corpusStanding}
          pinnedVideoPane={mobilePinnedPane}
          onNavigate={navigateToArtifactHash}
          onSelectClaim={openMobileInsightExplore}
          activeClaimId={mobileInsightExploreClaimId}
          onSeeScripture={openMobileInsightExplore}
        />
      ) : null}
      {showDesktopClaimsPane && desktopPremiumYoutube && insightsVisible && studyClaims.length > 0 ? (
        <ArtifactClaimsSection
          anchorId="claims"
          claims={studyClaims}
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
          <ArtifactEntitiesPanel
            artifactId={a.id}
            artifactStatus={a.status}
            artifactMetadata={mergedVideoMeta}
            variant="default"
          />
        </ArtifactCollapsibleSection>
      ) : null}

      {!desktopPremiumYoutube && a.kind === "youtube" && a.url && youtubeChaptersList.length > 0 ? (
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

      {a.kind === "youtube" && a.url && desktopPremiumYoutube && youtubeChaptersList.length > 0 ? (
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
          defaultOpenMobile
          defaultOpenDesktop
          storageKey={a.id ? `artifact-study-spine:${a.id}` : undefined}
        >
          <div
            className={cn(
              isDesktop
                ? "rounded-lg border border-primary/20 bg-primary/[0.04] p-4"
                : artifactTeachingsShellMobile,
            )}
          >
            <p
              className={cn(
                "leading-relaxed text-muted-foreground",
                isDesktop ? "mb-4 text-sm" : cn(artifactTeachingsIntroCallout, "mb-4 text-sm"),
              )}
            >
              This video has no chapter outline yet, so we lean on extracted{" "}
              <span className="font-medium text-foreground">teachings</span> (what the speaker invites you toward) alongside claims. Use{" "}
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
            <TeachingsPanel
              artifactId={a.id}
              artifactStatus={a.status}
              hideSectionIntro={!isDesktop}
            />
          </div>
        </ArtifactCollapsibleSection>
      )}

      {insightsVisible && !(a.kind === "youtube" && youtubeChaptersList.length === 0) && (
        <ArtifactCollapsibleSection
          title="Teachings"
          pinnedVideoPane={mobilePinnedPane}
          defaultOpenMobile={false}
          defaultOpenDesktop
          storageKey={a.id ? `artifact-teachings:${a.id}` : undefined}
        >
          <div className={cn(!isDesktop && artifactTeachingsShellMobile)}>
            <TeachingsPanel
              artifactId={a.id}
              artifactStatus={a.status}
              hideSectionIntro={!isDesktop}
            />
          </div>
        </ArtifactCollapsibleSection>
      )}

      {a.status === "ready" && studyClaims.length === 0 && !a.error && (
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

      <ArtifactDetailLegacyOverviewSummary
        status={a.status}
        overview={frameworkOverview}
        skip={desktopPremiumYoutube || showMobileOverview}
      />

      {insightsVisible && !desktopPremiumYoutube && !showMobileOverview ? (
        <ArtifactLibraryStanding
          artifactId={a.id}
          claimsCount={studyClaims.length}
          agreeCount={corpusStanding.agreeCount}
          disagreeCount={corpusStanding.disagreeCount}
          newCount={corpusStanding.newCount}
          peerLibraryCount={corpusStanding.peerLibraryCount}
          peers={corpusStanding.peers}
          echoClaimCount={corpusStanding.echoClaimCount}
          loading={corpusStanding.loading}
          error={corpusStanding.error}
          embeddingPending={corpusStanding.embeddingPending}
          onReload={corpusStanding.onReload}
        />
      ) : null}

      {insightsVisible && studyClaims.length > 0 && !desktopPremiumYoutube && !showMobileOverview ? (
        <ArtifactCollapsibleSection
          id="claims"
          pinnedVideoPane={mobilePinnedPane}
          title="Claims"
          count={studyClaims.length}
          countLabel={`${studyClaims.length} insights`}
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
            claims={studyClaims}
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

      {insightsVisible && !desktopPremiumYoutube && !showMobileOverview ? (
        <ArtifactCollapsibleSection
          id="entities"
          title="People & themes"
          pinnedVideoPane={mobilePinnedPane}
          description="Full index of people, books, scriptures, and themes."
          defaultOpenMobile={false}
          defaultOpenDesktop
          storageKey={a.id ? `artifact-entities:${a.id}` : undefined}
        >
          <ArtifactEntitiesPanel
            artifactId={a.id}
            artifactStatus={a.status}
            artifactMetadata={mergedVideoMeta}
            variant="default"
          />
        </ArtifactCollapsibleSection>
      ) : null}
      </ArtifactDetailStudyColumnWrapper>
        </div>
      ) : null}
        </div>

      {!isDesktop ? (
        <ArtifactDetailMobileTabPanels
          isDesktop={isDesktop}
          mobilePinnedPane={mobilePinnedPane}
          mobileTab={mobileTab}
          transcriptPanel={transcriptPanel}
          mobileJournalTabPanel={mobileJournalTabPanel}
          artifactId={a.id}
          bookmarkLabel={bookmarkLabel}
          onBookmarkLabelChange={setBookmarkLabel}
          noteBody={noteBody}
          onNoteBodyChange={setNoteBody}
          moments={moments}
          canCaptureMoments={canCaptureMoments}
          savingMoment={savingMoment}
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
      ) : null}
        </div>
        </div>

        <ArtifactDetailMobileAppDock
          visible={showArtifactAppDock}
          insightExploreOpen={artifactInsightExploreOpen}
          mobileTab={mobileTab}
          journalActive={artifactJournalOpen}
          anchor={desktopStudyDock ? "pane" : "viewport"}
          layoutRootSelector={ARTIFACT_STUDY_PANE_SELECTOR}
          onStudyClick={switchToStudyTab}
          onTranscriptClick={handleDockTranscriptClick}
          onJournalClick={handleDockJournalClick}
          onMenuClick={() => setMobileMenuOpen(true)}
          onHomeClick={() => navigate("/home")}
        />
        </Tabs>

        <aside
          ref={transcriptAsideRef}
          className="relative z-0 hidden min-w-0 lg:col-span-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden"
          aria-label="Transcript"
        >
          {transcriptPanel}
        </aside>
      </div>

      {desktopStudyDock ? (
        <ArtifactMobileMenu
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          showTrigger={false}
          sections={navSections}
          activeHash={pageSectionHash}
          showPaste={a.kind === "youtube"}
          showWrapUp={a.kind === "youtube" && a.status === "ready"}
          showReanalyze={!inFlight && a.status !== "error"}
          hasTranscript={Boolean(a.raw_text?.trim())}
          onNavigateSection={navigateToArtifactHash}
          onOpenTranscript={switchToTranscriptTab}
          onPaste={() => setPasteOpen(true)}
          onWrapUp={() => setWrapUpOpen(true)}
          onReanalyze={reanalyze}
          canCapture={canCaptureMoments}
          captureSaving={savingMoment}
          onBookmark={bookmarkCurrentMoment}
          onBelieve={believeCurrentMoment}
          onStudyJournal={openStudyJournal}
          onOpenJournalTimestamp={() => openJournalFromArtifact(getCurrentPlaybackSeconds())}
          onOpenJournalFull={() => openJournalFromArtifact()}
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
        claimsCount={studyClaims.length}
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
