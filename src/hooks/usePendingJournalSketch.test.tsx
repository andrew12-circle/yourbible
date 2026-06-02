import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const transcribeMock = vi.fn();

vi.mock("@/lib/journal/sketchTranscription", () => ({
  upsertSketchAndTranscribe: (...args: unknown[]) => transcribeMock(...args),
}));

vi.mock("@/lib/journal/suggestTitle", () => ({
  suggestJournalEntryTitle: vi.fn().mockResolvedValue({ ok: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

import { usePendingJournalSketch } from "./usePendingJournalSketch";

describe("usePendingJournalSketch", () => {
  beforeEach(() => {
    transcribeMock.mockReset();
  });

  it("keeps preview when transcription fails", async () => {
    transcribeMock.mockResolvedValue({ ok: false, error: "AI down" });
    const { result } = renderHook(() => usePendingJournalSketch());

    const file = new File(["x"], "sketch.png", { type: "image/png" });
    await act(async () => {
      await result.current.handleSketchSave(file);
    });
    expect(result.current.hasPendingSketch).toBe(true);
    expect(result.current.previewUrl).toBeTruthy();

    await act(async () => {
      await result.current.attachSketchToEntry("u1", "e1");
    });
    expect(result.current.hasPendingSketch).toBe(true);
    expect(transcribeMock).toHaveBeenCalledTimes(1);
  });

  it("clears preview on success", async () => {
    transcribeMock.mockResolvedValue({ ok: true, body: "text", skipped: false });
    const { result } = renderHook(() => usePendingJournalSketch());
    const file = new File(["x"], "sketch.png", { type: "image/png" });
    await act(async () => {
      await result.current.handleSketchSave(file);
    });
    await act(async () => {
      await result.current.attachSketchToEntry("u1", "e1");
    });
    await waitFor(() => expect(result.current.hasPendingSketch).toBe(false));
  });
});
