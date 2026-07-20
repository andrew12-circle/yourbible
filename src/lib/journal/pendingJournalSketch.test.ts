import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingJournalSketch,
  loadPendingJournalSketch,
  pendingJournalSketchKey,
  savePendingJournalSketch,
} from "./pendingJournalSketch";

describe("pendingJournalSketch", () => {
  afterEach(async () => {
    await clearPendingJournalSketch(pendingJournalSketchKey("u1", undefined, null));
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("round-trips a pending handwritten PNG without IndexedDB", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const key = pendingJournalSketchKey("u1", undefined, null);
    const file = new File(["png-bytes"], "sketch-reload.png", { type: "image/png" });

    await savePendingJournalSketch(key, file);
    const restored = await loadPendingJournalSketch(key);

    expect(restored?.name).toBe("sketch-reload.png");
    expect(restored?.type).toBe("image/png");
    expect(await restored?.text()).toBe("png-bytes");
  });

  it("clears the pending handwritten PNG", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const key = pendingJournalSketchKey("u1", undefined, null);
    await savePendingJournalSketch(key, new File(["x"], "sketch-clear.png", { type: "image/png" }));

    await clearPendingJournalSketch(key);

    expect(await loadPendingJournalSketch(key)).toBeNull();
  });
});
