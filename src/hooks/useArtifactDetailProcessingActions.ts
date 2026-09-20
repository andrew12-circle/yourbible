import { canResumeArtifactAnalysis } from "@/lib/framework/artifactAnalysisResume";
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { countTimedTranscriptLines, normalizePastedTranscript } from "@/lib/normalizePastedTranscript";
import { createTranscriptProcessingToken, restartYoutubeTranscriptFetch } from "@/lib/framework/youtubeTranscriptFetch";
import { resolveYouTubeVideoId } from "@/lib/youtube";
import type { ArtifactDetailClaim } from "@/hooks/useArtifactDetailData";

type Params = {
  a: ArtifactRow | null;
  setA: Dispatch<SetStateAction<ArtifactRow | null>>;
  setClaims: Dispatch<SetStateAction<ArtifactDetailClaim[]>>;
  transcriptNeedsFormatting: boolean;
  patchArtifactMetadata: (artifactId: string) => Promise<void>;
  pasteText: string;
  setPasteOpen: (open: boolean) => void;
  setSavingPaste: (saving: boolean) => void;
  setFormattingTranscript: (formatting: boolean) => void;
  setSyncingYoutubeChapters: (syncing: boolean) => void;
  setGeneratingChapters: (generating: boolean) => void;
};

export function useArtifactDetailProcessingActions({
  a, setA, transcriptNeedsFormatting, patchArtifactMetadata, pasteText, setPasteOpen,
  setSavingPaste, setFormattingTranscript, setSyncingYoutubeChapters, setGeneratingChapters,
}: Params) {
  const [retryingFetch, setRetryingFetch] = useState(false);
  const analysisRequestRef = useRef(false);
  const startAnalysis = useCallback(async (sourceText: string, replacedTranscript: boolean) => {
    if (!a || analysisRequestRef.current) return;
    analysisRequestRef.current = true;
    const targetId = a.id;
    const baseMeta = a.metadata && typeof a.metadata === "object" && !Array.isArray(a.metadata) ? { ...a.metadata } : {};
    const analysis = baseMeta.analysis_v2 && typeof baseMeta.analysis_v2 === "object" && !Array.isArray(baseMeta.analysis_v2)
      ? baseMeta.analysis_v2 : null;
    const normalized = normalizePastedTranscript(sourceText);
    const resume = !replacedTranscript && Boolean(a.processing_token) &&
      await canResumeArtifactAnalysis(normalized, analysis).catch(() => false);
    const processingToken = resume ? a.processing_token! : createTranscriptProcessingToken();
    delete baseMeta.analyze_inflight_at;
    if (replacedTranscript) {
      baseMeta.transcript_source = "paste";
      baseMeta.transcript_provider = "manual_paste";
    }
    if (!resume && analysis) baseMeta.analysis_v2 = { ...analysis, state: "stale" };
    const patch = { raw_text: normalized, status: "analyzing", error: null,
      processing_token: processingToken, metadata: baseMeta };
    try {
      let update = supabase.from("artifacts").update(patch).eq("id", targetId);
      update = a.processing_token ? update.eq("processing_token", a.processing_token) : update.is("processing_token", null);
      const saved = await update.select("id").maybeSingle();
      if (saved.error) throw new Error(saved.error.message);
      if (!saved.data) throw new Error("This source changed in another session. Reload before retrying.");
      setA(prev => prev?.id === targetId ? { ...prev, ...patch } : prev);
      // Never delete findings, research runs, notes, or entities before replacement succeeds.
      const invoked = await supabase.functions.invoke("framework-analyze", {
        body: { artifact_id: targetId, processing_token: processingToken, resume: Boolean(resume) },
      });
      if (invoked.error || invoked.data?.error) throw new Error(String(invoked.data?.error ?? invoked.error?.message));
      if (replacedTranscript) setPasteOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start analysis.";
      await supabase.from("artifacts").update({ status: "error", error: message })
        .eq("id", targetId).eq("processing_token", processingToken);
      setA(prev => prev?.id === targetId && prev.processing_token === processingToken
        ? { ...prev, status: "error", error: message } : prev);
      toast({ title: "Analysis did not start", description: `${message} Your previous research is unchanged.`, variant: "destructive" });
    } finally {
      analysisRequestRef.current = false;
    }
  }, [a, setA, setPasteOpen]);

  const reanalyze = useCallback(async () => {
    if (a) await startAnalysis(a.raw_text, false);
  }, [a, startAnalysis]);

  const formatTranscript = useCallback(async () => {
    if (!a?.raw_text.trim() || !transcriptNeedsFormatting) return;
    const normalized = normalizePastedTranscript(a.raw_text);
    setFormattingTranscript(true);
    let update = supabase.from("artifacts").update({ raw_text: normalized }).eq("id", a.id);
    if (a.updated_at) update = update.eq("updated_at", a.updated_at);
    const { data: formatted, error } = await update.select("id").maybeSingle();
    setFormattingTranscript(false);
    if (error || !formatted) {
      toast({ title: "Could not format transcript", description: error?.message ?? "This source changed in another session. Reload before formatting.", variant: "destructive" });
      return;
    }
    setA(prev => prev?.id === a.id ? { ...prev, raw_text: normalized } : prev);
    toast({ title: "Transcript formatted", description: `${countTimedTranscriptLines(normalized)} timed lines in [M:SS] format.` });
  }, [a, setA, setFormattingTranscript, transcriptNeedsFormatting]);

  const syncYouTubeChapters = useCallback(async () => {
    if (!a || a.kind !== "youtube") return;
    setSyncingYoutubeChapters(true);
    try {
      const { error } = await supabase.functions.invoke("framework-sync-youtube-chapters", { body: { artifact_id: a.id } });
      if (error) throw error;
      await patchArtifactMetadata(a.id);
      toast({ title: "Synced chapters from YouTube" });
    } catch {
      toast({ title: "Could not sync chapters from YouTube", variant: "destructive" });
    } finally { setSyncingYoutubeChapters(false); }
  }, [a, patchArtifactMetadata, setSyncingYoutubeChapters]);

  const generateChaptersFromTranscript = useCallback(async (force = false) => {
    if (!a || a.kind !== "youtube") return;
    setGeneratingChapters(true);
    try {
      const { data, error } = await supabase.functions.invoke("framework-generate-chapters", { body: { artifact_id: a.id, force } });
      if (error) throw error;
      const payload = data as { error?: string; skipped?: boolean; count?: number } | null;
      if (payload?.error) throw new Error(payload.error);
      await patchArtifactMetadata(a.id);
      toast({ title: payload?.skipped ? "Chapters already present" : "Chapters generated",
        description: payload?.skipped ? undefined : `${payload?.count ?? "New"} sections available for navigation.` });
    } catch {
      toast({ title: "Could not generate chapters", variant: "destructive" });
    } finally { setGeneratingChapters(false); }
  }, [a, patchArtifactMetadata, setGeneratingChapters]);

  const retryFetch = useCallback(async () => {
    if (!a?.url || retryingFetch) return;
    const targetId = a.id;
    setRetryingFetch(true);
    setA(prev => prev?.id === targetId ? { ...prev, status: "fetching", error: null } : prev);
    try {
      const result = await restartYoutubeTranscriptFetch(a.id, a.url, {
        videoId: resolveYouTubeVideoId(a.url, a.metadata), metadata: a.metadata,
      });
      if (!result.ok) {
        setA(prev => prev?.id === targetId ? { ...prev, status: "error", error: result.error ?? prev.error } : prev);
        toast({ title: "Transcript fetch failed", description: result.error ?? "Try again or paste the transcript.", variant: "destructive" });
      }
    } finally { setRetryingFetch(false); }
  }, [a, retryingFetch, setA]);

  const submitPasted = useCallback(async () => {
    if (!a || !pasteText.trim() || analysisRequestRef.current) return;
    setSavingPaste(true);
    try { await startAnalysis(pasteText, true); }
    finally { setSavingPaste(false); }
  }, [a, pasteText, setSavingPaste, startAnalysis]);

  return { reanalyze, formatTranscript, syncYouTubeChapters, generateChaptersFromTranscript,
    retryFetch, retryingFetch, submitPasted };
}
