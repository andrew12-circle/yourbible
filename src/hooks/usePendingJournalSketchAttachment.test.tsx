import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { saveSketchDraft, sketchDraftStorageKey } from "@/lib/journal/sketchDraft";
import {
  loadPendingJournalSketch,
  pendingJournalSketchKey,
  savePendingJournalSketch,
} from "@/lib/journal/pendingJournalSketch";
import { usePendingJournalSketchAttachment } from "./usePendingJournalSketchAttachment";

describe("usePendingJournalSketchAttachment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("restores a saved handwritten file after a compose reload", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const draftKey = pendingJournalSketchKey("u1", undefined, null);
    await savePendingJournalSketch(
      draftKey,
      new File(["png"], "sketch-reload.png", { type: "image/png" }),
    );

    const { result } = renderHook(() =>
      usePendingJournalSketchAttachment({
        userId: "u1",
        editId: undefined,
        draftKey,
      }),
    );

    await waitFor(() => expect(result.current.pendingFiles).toHaveLength(1));
    expect(result.current.pendingFiles[0].name).toBe("sketch-reload.png");
  });

  it("persists a newly saved handwritten file and clears it when removed", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const draftKey = pendingJournalSketchKey("u1", undefined, null);
    saveSketchDraft(draftKey, {
      strokes: [{ tool: "fountain", color: "#000", size: 6, points: [{ x: 1, y: 2, p: 0.5 }] }],
      paper: "ruled",
      color: "#000",
      size: 6,
      tool: "fountain",
    });

    const { result } = renderHook(() =>
      usePendingJournalSketchAttachment({
        userId: "u1",
        editId: undefined,
        draftKey,
      }),
    );
    const file = new File(["png"], "sketch-kept.png", { type: "image/png" });

    await act(async () => {
      await result.current.savePendingSketchFile(file);
    });
    expect((await loadPendingJournalSketch(draftKey))?.name).toBe("sketch-kept.png");

    act(() => {
      result.current.removePendingFile(file);
    });

    await waitFor(async () => {
      expect(await loadPendingJournalSketch(draftKey)).toBeNull();
      expect(localStorage.getItem(sketchDraftStorageKey(draftKey))).toBeNull();
    });
  });
});
