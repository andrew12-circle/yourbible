import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import {
  countTimedTranscriptLines,
  normalizePastedTranscript,
} from "@/lib/normalizePastedTranscript";
import {
  createTranscriptProcessingToken,
  restartYoutubeTranscriptFetch,
} from "@/lib/framework/youtubeTranscriptFetch";
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
}: Params) {
  const [retryingFetch, setRetryingFetch] = useState(false);

  const reanalyze = useCallback(async () => {
    if (!a) return;
    const normalized = normalizePastedTranscript(a.raw_text);
    const persistNormalized = normalized !== a.raw_text.trim();
    const processingToken = createTranscriptProcessingToken();
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
  }, [a, setA, setClaims]);

  const formatTranscript = useCallback(async () => {
    if (!a?.raw_text.trim() || !transcriptNeedsFormatting) return;
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
  }, [a, setA, setFormattingTranscript, transcriptNeedsFormatting]);

  const syncYouTubeChapters = useCallback(async () => {
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
  }, [a, patchArtifactMetadata, setSyncingYoutubeChapters]);

  const generateChaptersFromTranscript = useCallback(
    async (force = false) => {
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
    },
    [a, patchArtifactMetadata, setGeneratingChapters],
  );

  const retryFetch = useCallback(async () => {
    if (!a?.url || retryingFetch) return;
    setRetryingFetch(true);
    setA((prev) => (prev ? { ...prev, status: "fetching", error: null } : prev));

    const result = await restartYoutubeTranscriptFetch(a.id, a.url, {
      videoId: resolveYouTubeVideoId(a.url, a.metadata),
      metadata: a.metadata,
    });
    setRetryingFetch(false);

    if (!result.ok) {
      setA((prev) => (prev ? { ...prev, status: "error", error: result.error ?? prev.error } : prev));
      toast({
        title: "Transcript fetch failed",
        description: result.error ?? "Try again or paste the transcript.",
        variant: "destructive",
      });
    }
  }, [a, retryingFetch, setA]);

  const submitPasted = useCallback(async () => {
    if (!a || !pasteText.trim()) return;
    const normalized = normalizePastedTranscript(pasteText);
    setSavingPaste(true);
    const processingToken = createTranscriptProcessingToken();
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
  }, [a, pasteText, setA, setClaims, setPasteOpen, setSavingPaste]);

  return {
    reanalyze,
    formatTranscript,
    syncYouTubeChapters,
    generateChaptersFromTranscript,
    retryFetch,
    retryingFetch,
    submitPasted,
  };
}
