import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { suggestJournalEntryTitle } from "@/lib/journal/suggestTitle";
import { upsertSketchAndTranscribe } from "@/lib/journal/sketchTranscription";

/** Holds a sketch PNG until the parent journal entry is saved. */
export function usePendingJournalSketch() {
  const [sketchOpen, setSketchOpen] = useState(false);
  const [pendingSketchFile, setPendingSketchFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const clearPendingSketch = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPendingSketchFile(null);
  }, []);

  const handleSketchSave = useCallback(async (file: File) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setPendingSketchFile(file);
    setSketchOpen(false);
    toast({
      title: "Handwritten note ready",
      description: "Save the entry to attach it to your journal.",
    });
  }, []);

  const attachSketchToEntry = useCallback(
    async (
      userId: string,
      entryId: string,
      opts?: { onBody?: (body: string) => void; onTitle?: (title: string) => void },
    ) => {
      if (!pendingSketchFile) return;
      toast({ title: "Reading your handwritten note…", description: "AI is transcribing your handwriting." });
      const result = await upsertSketchAndTranscribe(userId, entryId, pendingSketchFile);
      if (!result.ok) {
        toast({
          title: "Transcription failed",
          description: result.error ?? "Your sketch is still attached — try saving again.",
          variant: "destructive",
        });
        return;
      }
      clearPendingSketch();
      if (result.skipped) {
        toast({ title: "Handwritten note attached" });
        return;
      }
      if (result.body) opts?.onBody?.(result.body);
      let namedTitle = result.title;
      if (!namedTitle && result.body) {
        const suggested = await suggestJournalEntryTitle({ entryId, body: result.body });
        if (suggested.ok) namedTitle = suggested.title;
      }
      if (namedTitle) opts?.onTitle?.(namedTitle);
      toast({
        title: namedTitle ? "Entry named and transcribed" : "Handwritten note transcribed",
        description: namedTitle
          ? `“${namedTitle}” — text was added to your journal entry.`
          : "Text was added to your journal entry.",
      });
    },
    [pendingSketchFile, clearPendingSketch],
  );

  return {
    sketchOpen,
    setSketchOpen,
    previewUrl,
    hasPendingSketch: !!pendingSketchFile,
    handleSketchSave,
    clearPendingSketch,
    attachSketchToEntry,
  };
}
