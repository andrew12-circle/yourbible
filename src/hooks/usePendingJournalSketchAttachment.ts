import { useCallback, useEffect, useState } from "react";
import { clearSketchDraft } from "@/lib/journal/sketchDraft";
import { isJournalSketchAsset } from "@/lib/journal/sketchPhotos";
import {
  clearPendingJournalSketch,
  loadPendingJournalSketch,
  savePendingJournalSketch,
} from "@/lib/journal/pendingJournalSketch";

type UsePendingJournalSketchAttachmentOpts = {
  userId: string | undefined;
  editId: string | undefined;
  draftKey: string;
};

export function usePendingJournalSketchAttachment({
  userId,
  editId,
  draftKey,
}: UsePendingJournalSketchAttachmentOpts) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!userId || editId) return;
    let cancelled = false;
    void loadPendingJournalSketch(draftKey).then((file) => {
      if (cancelled || !file) return;
      setPendingFiles((current) => {
        if (current.some((item) => isJournalSketchAsset(item.name))) return current;
        return [...current.filter((item) => !isJournalSketchAsset(item.name)), file];
      });
    });
    return () => {
      cancelled = true;
    };
  }, [draftKey, editId, userId]);

  const addPendingFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setPendingFiles((current) => [...current, ...files]);
  }, []);

  const savePendingSketchFile = useCallback(
    async (file: File) => {
      if (!editId) await savePendingJournalSketch(draftKey, file);
      setPendingFiles((current) => [
        ...current.filter((item) => !isJournalSketchAsset(item.name)),
        file,
      ]);
    },
    [draftKey, editId],
  );

  const clearStoredPendingSketch = useCallback(async () => {
    await clearPendingJournalSketch(draftKey);
    clearSketchDraft(draftKey);
  }, [draftKey]);

  const removePendingFile = useCallback(
    (file: File) => {
      setPendingFiles((current) => current.filter((item) => item !== file));
      if (isJournalSketchAsset(file.name)) {
        void clearStoredPendingSketch();
      }
    },
    [clearStoredPendingSketch],
  );

  return {
    pendingFiles,
    setPendingFiles,
    addPendingFiles,
    savePendingSketchFile,
    removePendingFile,
    clearStoredPendingSketch,
  };
}
