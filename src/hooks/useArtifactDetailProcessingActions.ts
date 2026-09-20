import type { Json } from "@/integrations/supabase/types";
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { normalizePastedTranscript } from "@/lib/normalizePastedTranscript";
import { createTranscriptProcessingToken, restartYoutubeTranscriptFetch } from "@/lib/framework/youtubeTranscriptFetch";
import { resolveYouTubeVideoId } from "@/lib/youtube";
import type { ArtifactDetailClaim } from "@/hooks/useArtifactDetailData";

type Params = {
  a: ArtifactRow | null; setA: Dispatch<SetStateAction<ArtifactRow | null>>;
  setClaims: Dispatch<SetStateAction<ArtifactDetailClaim[]>>;
  transcriptNeedsFormatting: boolean; patchArtifactMetadata: (artifactId: string) => Promise<void>;
  pasteText: string; setPasteOpen: (open: boolean) => void; setSavingPaste: (saving: boolean) => void;
  setFormattingTranscript: (formatting: boolean) => void; setSyncingYoutubeChapters: (syncing: boolean) => void;
  setGeneratingChapters: (generating: boolean) => void;
};

export function useArtifactDetailProcessingActions({
  a, setA, transcriptNeedsFormatting, patchArtifactMetadata, pasteText,
  setPasteOpen, setSavingPaste, setFormattingTranscript, setSyncingYoutubeChapters, setGeneratingChapters,
}: Params) {
  const [retryingFetch, setRetryingFetch] = useState(false);
  const busy = useRef<string | null>(null);
  const identity = useRef(a?.id);
  identity.current = a?.id;
  useEffect(() => {
    busy.current = null;
    setSavingPaste(false); setFormattingTranscript(false); setRetryingFetch(false);
    setSyncingYoutubeChapters(false); setGeneratingChapters(false);
  }, [a?.id, setSavingPaste, setFormattingTranscript, setSyncingYoutubeChapters, setGeneratingChapters]);

  const saveAndAnalyze = useCallback(async (text: string, source: "existing" | "paste") => {
    if (!a || busy.current) return false;
    const operation = createTranscriptProcessingToken();
    busy.current = operation;
    const id = a.id;
    const normalized = normalizePastedTranscript(text);
    const metadata: Record<string, Json | undefined> = a.metadata && typeof a.metadata === "object" && !Array.isArray(a.metadata) ? { ...a.metadata } : {};
    const analysis = metadata.analysis && typeof metadata.analysis === "object" && !Array.isArray(metadata.analysis) ? metadata.analysis : {};
    const resume = source === "existing" && normalized === a.raw_text && Boolean(a.processing_token) &&
      ["partial", "failed"].includes(String(analysis.status));
    const token = resume ? a.processing_token! : createTranscriptProcessingToken();
    try {
      if (normalized.trim().length < 80) throw new Error("Provide at least 80 characters of source text before analyzing.");
      if (!resume) {
        delete metadata.analyze_inflight_at;
        delete metadata.analysis;
        // Do not show a summary generated from a previous transcript as the new source's summary.
        delete metadata.findings_overview;
        delete metadata.framework_overview;
        if (source === "paste") { metadata.transcript_provider = "manual_paste"; metadata.transcript_source = "paste"; }
        let update = supabase.from("artifacts").update({ raw_text: normalized, metadata,
          status: "analyzing", error: null, processing_token: token }).eq("id", id);
        update = a.processing_token ? update.eq("processing_token", a.processing_token) : update.is("processing_token", null);
        const saved = await update.select("id").maybeSingle();
        if (saved.error) throw saved.error;
        if (!saved.data) throw new Error("This artifact changed in another session. Reload before retrying.");
        if (identity.current === id) setA((previous) => previous?.id === id ? {
          ...previous, raw_text: normalized, metadata, processing_token: token, status: "analyzing", error: null,
        } : previous);
      }
      // No DELETE calls. The worker creates a new version and publishes it transactionally.
      const { data, error } = await supabase.functions.invoke("framework-analyze", {
        body: { artifact_id: id, processing_token: token, resume },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      if (identity.current === id) await patchArtifactMetadata(id);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start analysis. Saved research is unchanged.";
      // A lost response does not prove the worker failed. Do not overwrite a running server job.
      if (identity.current === id) {
        toast({ title: "Could not confirm analysis started", description: message, variant: "destructive" });
        await patchArtifactMetadata(id);
      }
      return false;
    } finally { if (busy.current === operation) busy.current = null; }
  }, [a, patchArtifactMetadata, setA]);

  const reanalyze = useCallback(async () => {
    if (a?.raw_text.trim()) await saveAndAnalyze(a.raw_text, "existing");
  }, [a, saveAndAnalyze]);
  const submitPasted = useCallback(async () => {
    if (!a || !pasteText.trim()) return;
    const id = a.id;
    setSavingPaste(true);
    try {
      if (await saveAndAnalyze(pasteText, "paste") && identity.current === id) {
        setPasteOpen(false);
        toast({ title: "Transcript saved", description: "New analysis is queued. Existing findings and research are preserved." });
      }
    } finally { if (identity.current === id) setSavingPaste(false); }
  }, [a, pasteText, saveAndAnalyze, setPasteOpen, setSavingPaste]);
  const formatTranscript = useCallback(async () => {
    if (!a?.raw_text.trim() || !transcriptNeedsFormatting) return;
    const id = a.id;
    setFormattingTranscript(true);
    try { await saveAndAnalyze(a.raw_text, "existing"); }
    finally { if (identity.current === id) setFormattingTranscript(false); }
  }, [a, saveAndAnalyze, setFormattingTranscript, transcriptNeedsFormatting]);

  const syncYouTubeChapters = useCallback(async () => {
    if (!a || a.kind !== "youtube") return;
    const id = a.id;
    setSyncingYoutubeChapters(true);
    try {
      const { data, error } = await supabase.functions.invoke("framework-sync-youtube-chapters", { body: { artifact_id: id } });
      if (error || data?.error) throw error ?? new Error(String(data.error));
      if (identity.current === id) await patchArtifactMetadata(id);
    } catch { if (identity.current === id) toast({ title: "Could not sync chapters", variant: "destructive" }); }
    finally { if (identity.current === id) setSyncingYoutubeChapters(false); }
  }, [a, patchArtifactMetadata, setSyncingYoutubeChapters]);
  const generateChaptersFromTranscript = useCallback(async (force = false) => {
    if (!a || a.kind !== "youtube") return;
    const id = a.id;
    setGeneratingChapters(true);
    try {
      const { data, error } = await supabase.functions.invoke("framework-generate-chapters", { body: { artifact_id: id, force } });
      if (error || data?.error) throw error ?? new Error(String(data.error));
      if (identity.current === id) await patchArtifactMetadata(id);
    } catch { if (identity.current === id) toast({ title: "Could not generate chapters", variant: "destructive" }); }
    finally { if (identity.current === id) setGeneratingChapters(false); }
  }, [a, patchArtifactMetadata, setGeneratingChapters]);
  const retryFetch = useCallback(async () => {
    if (!a?.url || retryingFetch) return;
    const id = a.id;
    setRetryingFetch(true);
    try {
      const result = await restartYoutubeTranscriptFetch(id, a.url, { videoId: resolveYouTubeVideoId(a.url, a.metadata), metadata: a.metadata });
      if (!result.ok) throw new Error(result.error ?? "Transcript fetch could not start");
      if (identity.current === id) await patchArtifactMetadata(id);
    } catch (error) {
      if (identity.current === id) toast({ title: "Transcript fetch failed", description: error instanceof Error ? error.message : "Try again or paste the transcript.", variant: "destructive" });
    } finally { if (identity.current === id) setRetryingFetch(false); }
  }, [a, patchArtifactMetadata, retryingFetch]);
  return { reanalyze, formatTranscript, syncYouTubeChapters, generateChaptersFromTranscript,
    retryFetch, retryingFetch, submitPasted };
}
