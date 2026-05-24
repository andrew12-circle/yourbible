import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import {
  buildLiveArtifactRawText,
  detectLiveClaimCandidates,
  formatLiveClock,
  parseLiveTranscriptInput,
  type LiveClaimCandidate,
  type LiveTranscriptChunk,
} from "@/lib/framework/liveStream";
import { getYouTubeVideoId } from "@/lib/youtube";
import { buildYouTubeEmbedSrc } from "@/lib/youtube/embed";

function nextStartSeconds(chunks: LiveTranscriptChunk[]): number {
  const last = chunks.reduce((latest, chunk) => Math.max(latest, chunk.startSeconds), 0);
  return last ? last + 8 : 0;
}

function claimTone(claim: LiveClaimCandidate): string {
  return [
    claim.category.replace(/_/g, " "),
    `${Math.round(claim.confidence * 100)}% confidence`,
    claim.signals.join(", "),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function useLiveStreamCapture(userId?: string | null) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [chunks, setChunks] = useState<LiveTranscriptChunk[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedArtifactId, setSavedArtifactId] = useState<string | null>(null);

  const youTubeVideoId = useMemo(() => getYouTubeVideoId(url), [url]);
  const embedUrl = useMemo(
    () => (youTubeVideoId ? buildYouTubeEmbedSrc(youTubeVideoId, 0, { autoplay: false }) : null),
    [youTubeVideoId],
  );
  const liftedClaims = useMemo(() => detectLiveClaimCandidates(chunks), [chunks]);
  const rawText = useMemo(() => buildLiveArtifactRawText(chunks), [chunks]);

  const addTranscriptDraft = useCallback(() => {
    const parsed = parseLiveTranscriptInput(transcriptDraft, nextStartSeconds(chunks));
    if (!parsed.length) {
      toast({ title: "Add transcript text first", variant: "destructive" });
      return;
    }

    setChunks((prev) => {
      const seen = new Set(prev.map((chunk) => chunk.id));
      return [...prev, ...parsed.filter((chunk) => !seen.has(chunk.id))].sort(
        (a, b) => a.startSeconds - b.startSeconds,
      );
    });
    setTranscriptDraft("");
  }, [chunks, transcriptDraft]);

  const removeChunk = useCallback((id: string) => {
    setChunks((prev) => prev.filter((chunk) => chunk.id !== id));
  }, []);

  const clearSession = useCallback(() => {
    setChunks([]);
    setTranscriptDraft("");
    setSavedArtifactId(null);
  }, []);

  const saveSession = useCallback(async () => {
    if (!userId) {
      toast({ title: "Sign in to save this live capture", variant: "destructive" });
      return null;
    }
    if (!youTubeVideoId || !url.trim()) {
      toast({ title: "Paste a YouTube live URL first", variant: "destructive" });
      return null;
    }
    if (!chunks.length) {
      toast({ title: "Add transcript chunks before saving", variant: "destructive" });
      return null;
    }

    setSaving(true);
    const fallbackTitle = `Live stream capture ${new Date().toLocaleDateString()}`;
    const metadata = {
      source: "youtube",
      video_id: youTubeVideoId,
      import_via: "live_capture_workspace",
      live_capture: {
        capture_mode: "operator_transcript_feed",
        transcript_source: "manual_or_external_stt",
        intelligence: "local_signal_detector",
        rebroadcast_surface: "framework_live_workspace",
        saved_at: new Date().toISOString(),
      },
    };

    const { data, error } = await supabase
      .from("artifacts")
      .insert({
        user_id: userId,
        title: title.trim() || fallbackTitle,
        kind: "youtube",
        url: url.trim(),
        raw_text: rawText,
        status: "ready",
        metadata,
      })
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setSaving(false);
      toast({ title: "Could not save live capture", description: error?.message, variant: "destructive" });
      return null;
    }

    if (liftedClaims.length) {
      const rows = liftedClaims.map((claim) => ({
        user_id: userId,
        artifact_id: data.id,
        claim: claim.claim,
        tone: claimTone(claim),
        doctrine_tags: [claim.category, ...claim.signals].map((signal) => signal.replace(/_/g, " ")),
        scripture_supports: claim.linkedScriptures.map((ref) => ({
          ref,
          note: "Detected in live transcript.",
        })) as Json,
        scripture_challenges: [] as Json,
        match_relation: "new",
        bias_flags: claim.signals.includes("contradiction") ? ["needs_review"] : [],
        user_note: `Lifted from live stream at ${formatLiveClock(claim.startSeconds)}.`,
        chapter_start_seconds: Math.floor(claim.startSeconds),
      }));
      const { error: claimError } = await supabase.from("artifact_claims").insert(rows);
      if (claimError) {
        toast({
          title: "Live transcript saved, claims need review",
          description: claimError.message,
          variant: "destructive",
        });
      }
    }

    setSavedArtifactId(data.id);
    setSaving(false);
    toast({
      title: "Live capture saved",
      description: `${chunks.length} transcript chunk${chunks.length === 1 ? "" : "s"} and ${liftedClaims.length} lifted claim${
        liftedClaims.length === 1 ? "" : "s"
      }.`,
    });
    return data.id;
  }, [chunks, liftedClaims, rawText, title, url, userId, youTubeVideoId]);

  return {
    title,
    setTitle,
    url,
    setUrl,
    transcriptDraft,
    setTranscriptDraft,
    chunks,
    liftedClaims,
    rawText,
    youTubeVideoId,
    embedUrl,
    saving,
    savedArtifactId,
    addTranscriptDraft,
    removeChunk,
    clearSession,
    saveSession,
  };
}
