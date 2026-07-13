import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { floatingJournalInsertRef } from "@/lib/journal/floatingJournalInsertRef";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";
import {
  artifactJournalReturnPath,
  handoffArtifactVideoForJournal,
} from "@/lib/framework/artifactJournalNavigation";
import {
  buildClaimResearchJournalTitle,
  buildClaimResearchMarkdown,
  withYouTubeTimestamp,
} from "@/lib/framework/artifactDetailPageHelpers";
import {
  collectTranscriptTextOverlappingInclusiveRange,
  formatTranscriptClock,
  type TranscriptSegment,
} from "@/lib/transcriptSplit";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import type { ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";
import type {
  ArtifactMoment,
  ArtifactMomentKind,
  Claim,
  MatchedBelief,
} from "@/lib/framework/artifactDetailTypes";

type Params = {
  artifact: ArtifactRow | null;
  userId?: string;
  youTubeVideoId: string | null;
  displayTranscriptText: string;
  claimsDigest: string;
  navigate: NavigateFunction;
  matchedBeliefs: Record<string, MatchedBelief>;
  isDesktop: boolean;
  mobilePinnedPane: boolean;
  openMobileResearchTab: () => void;
  openArtifactJournal: (mode?: "docked" | "expanded") => void;
  getPlaybackSeconds: () => number;
  getCurrentPlaybackSeconds: () => number;
  getIsPlaying: () => boolean;
  getWantsContinuousPlayback: () => boolean;
  persistSeconds: (seconds: number) => void;
  seekVideoToSeconds: (seconds: number, opts?: { play?: boolean; scrollTranscript?: boolean }) => void;
  pipEnabled: boolean;
  enterPip: () => void;
  pipLayout?: ArtifactPipLayout;
  bookmarkLabel: string;
  setBookmarkLabel: Dispatch<SetStateAction<string>>;
  noteBody: string;
  setNoteBody: Dispatch<SetStateAction<string>>;
  setSavingMoment: Dispatch<SetStateAction<boolean>>;
  setMoments: Dispatch<SetStateAction<ArtifactMoment[]>>;
  setQuickBeliefText: Dispatch<SetStateAction<string>>;
  setQuickBeliefSource: Dispatch<SetStateAction<string>>;
  setQuickBeliefOpen: Dispatch<SetStateAction<boolean>>;
  transcriptTimedLayout: boolean;
  transcriptSegments: TranscriptSegment[];
  lastBookmarkJournalInsertAtRef: MutableRefObject<number>;
};

export function useArtifactMomentActions({
  artifact,
  userId,
  youTubeVideoId,
  displayTranscriptText,
  claimsDigest,
  navigate,
  matchedBeliefs,
  isDesktop,
  mobilePinnedPane,
  openMobileResearchTab,
  openArtifactJournal,
  getPlaybackSeconds,
  getCurrentPlaybackSeconds,
  getIsPlaying,
  getWantsContinuousPlayback,
  persistSeconds,
  seekVideoToSeconds,
  pipEnabled,
  enterPip,
  pipLayout,
  bookmarkLabel,
  setBookmarkLabel,
  noteBody,
  setNoteBody,
  setSavingMoment,
  setMoments,
  setQuickBeliefText,
  setQuickBeliefSource,
  setQuickBeliefOpen,
  transcriptTimedLayout,
  transcriptSegments,
  lastBookmarkJournalInsertAtRef,
}: Params) {
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
    if (!artifact || !userId) return null;
    const startSeconds = values.startSeconds ?? getCurrentPlaybackSeconds();
    setSavingMoment(true);
    const payload = {
      user_id: userId,
      artifact_id: artifact.id,
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
    const saved = data as unknown as ArtifactMoment;
    setMoments((current) => [...current, saved].sort((left, right) => left.start_seconds - right.start_seconds));
    const title = kind === "note" ? "Note saved" : kind === "belief_seed" ? "Belief moment saved" : "Moment bookmarked";
    const d = values.toastDescription?.trim();
    toast(d ? { title, description: d } : { title });
    return saved;
  };

  const openJournalFromArtifact = (startSeconds?: number) => {
    if (!artifact) return;
    const returnTo = artifactJournalReturnPath(artifact.id);
    if (youTubeVideoId) {
      handoffArtifactVideoForJournal({
        artifactId: artifact.id,
        youTubeVideoId,
        title: artifact.title ?? null,
        getPlaybackSeconds,
        getIsPlaying,
        persistSeconds,
        pipLayout,
      });
    }
    const qs = new URLSearchParams();
    qs.set("returnTo", encodeURIComponent(returnTo));
    if (artifact.title) qs.set("artifactTitle", encodeURIComponent(artifact.title));
    if (artifact.url) qs.set("artifactUrl", encodeURIComponent(startSeconds == null ? artifact.url : withYouTubeTimestamp(artifact.url, startSeconds)));
    if (displayTranscriptText) qs.set("artifactTranscript", encodeURIComponent(displayTranscriptText.slice(0, 12000)));
    if (claimsDigest) qs.set("artifactClaims", encodeURIComponent(claimsDigest.slice(0, 6000)));
    if (startSeconds != null) qs.set("artifactTime", String(Math.max(0, Math.floor(startSeconds))));
    navigate(`/journal/new?${qs.toString()}`);
  };

  const openJournalFromClaim = (claim: Claim, startSeconds?: number) => {
    if (!artifact) return;
    const returnTo = artifactJournalReturnPath(artifact.id);
    if (youTubeVideoId) {
      handoffArtifactVideoForJournal({
        artifactId: artifact.id,
        youTubeVideoId,
        title: artifact.title ?? null,
        getPlaybackSeconds,
        getIsPlaying,
        persistSeconds,
        pipLayout,
      });
    }
    const qs = new URLSearchParams();
    qs.set("returnTo", encodeURIComponent(returnTo));
    if (artifact.title) qs.set("artifactTitle", encodeURIComponent(`${artifact.title} — one claim`));
    if (artifact.url) qs.set("artifactUrl", encodeURIComponent(startSeconds == null ? artifact.url : withYouTubeTimestamp(artifact.url, startSeconds)));
    if (displayTranscriptText) qs.set("artifactTranscript", encodeURIComponent(displayTranscriptText.slice(0, 12000)));
    qs.set("artifactClaims", encodeURIComponent(`Focus on this claim:\n\n${claim.claim}`));
    if (startSeconds != null) qs.set("artifactTime", String(Math.max(0, Math.floor(startSeconds))));
    navigate(`/journal/new?${qs.toString()}`);
  };

  const startClaimResearchChat = (claim: Claim, source: TranscriptSegment | null | undefined) => {
    if (!artifact) return;
    const belief = claim.matched_belief_id ? matchedBeliefs[claim.matched_belief_id] : undefined;
    const markdown = buildClaimResearchMarkdown(artifact.title, claim, source, belief);
    const handoff = {
      claimId: claim.id,
      artifactId: artifact.id,
      claimMarkdown: markdown,
      journalTitle: buildClaimResearchJournalTitle(artifact.title, claim),
      transcriptExcerpt: source?.text ? source.text.slice(0, 4000) : undefined,
      initialTab: "chat" as const,
      claimPreview: claim.claim.trim().slice(0, 220) || "Claim",
      matchedBeliefId: claim.matched_belief_id,
      artifactTitle: artifact.title,
    };
    if (!isDesktop) {
      if (mobilePinnedPane) {
        useFloatingJournalStore.getState().setFloatingClaimResearch(handoff);
        openMobileResearchTab();
        return;
      }
      useFloatingJournalStore.getState().setFloatingClaimResearch(handoff);
      navigate(`/framework/artifacts/${artifact.id}/research/${claim.id}`);
      return;
    }
    useFloatingJournalStore.getState().setFloatingClaimResearch(handoff);
    useFloatingJournalStore.getState().setArtifactJournalMode("closed");
    useFloatingJournalStore.getState().setPanelOpen(true);
    if (getWantsContinuousPlayback() && pipEnabled) {
      enterPip();
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

  const openStudyJournal = () => openArtifactJournal("docked");

  const journalTranscriptSegment = (seconds: number, snippet: string) => {
    if (!artifact) return;
    const t = Math.max(0, Math.floor(seconds));
    seekVideoToSeconds(t, { play: false });
    openStudyJournal();
    const routeId = useFloatingJournalStore.getState().routeArtifact?.id;
    const insertTarget = floatingJournalInsertRef.current;
    const journalOpen =
      useFloatingJournalStore.getState().panelOpen ||
      useFloatingJournalStore.getState().artifactJournalMode !== "closed";
    if (insertTarget?.artifactId === artifact.id && routeId === artifact.id && journalOpen) {
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
    if (!artifact) return;
    const t = getCurrentPlaybackSeconds();
    const t0 = Math.max(0, t - 10);
    const panelOpen = useFloatingJournalStore.getState().panelOpen;
    const inlineJournal = useFloatingJournalStore.getState().artifactJournalMode !== "closed";
    const routeId = useFloatingJournalStore.getState().routeArtifact?.id;
    const insertTarget = floatingJournalInsertRef.current;
    const journalTied =
      (panelOpen || inlineJournal) &&
      routeId === artifact.id &&
      insertTarget?.artifactId === artifact.id &&
      artifact.kind === "youtube";

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
    if (!artifact) return;
    const seconds = getCurrentPlaybackSeconds();
    const timestamp = formatTranscriptClock(seconds);
    const sourceUrl = withYouTubeTimestamp(artifact.url, seconds);
    const text = `I believe this from ${artifact.title || "this video"} at ${timestamp}:\n\n`;
    const source = sourceUrl || `${artifact.title || "YouTube artifact"} at ${timestamp}`;
    setQuickBeliefText(text);
    setQuickBeliefSource(source);
    setQuickBeliefOpen(true);
    await saveMoment("belief_seed", { label: "Belief seed", body: text, startSeconds: seconds });
  };

  return {
    copyTranscript,
    openJournalFromArtifact,
    openJournalFromClaim,
    startClaimResearchChat,
    bookmarkAtSeconds,
    journalTranscriptSegment,
    researchLaterTranscriptSegment,
    saveSegmentNote,
    bookmarkCurrentMoment,
    addNoteAtCurrentMoment,
    believeCurrentMoment,
    openStudyJournal,
  };
}
