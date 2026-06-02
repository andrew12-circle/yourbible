import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const uploadMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

vi.mock("@/lib/journal/sketchPhotos", () => ({
  upsertEntrySketchPhoto: (...args: unknown[]) => uploadMock(...args),
}));

vi.mock("@/lib/journal/suggestTitle", () => ({
  suggestJournalEntryTitle: vi.fn().mockResolvedValue({ ok: false }),
}));

import {
  transcribeJournalSketch,
  upsertSketchAndTranscribe,
} from "./sketchTranscription";

describe("transcribeJournalSketch", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    uploadMock.mockReset();
  });

  it("returns body on success", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, body: "Hello from sketch" },
      error: null,
    });
    const r = await transcribeJournalSketch({ entryId: "e1", storagePath: "u/e1/sketch.png" });
    expect(r.ok).toBe(true);
    expect(r.body).toBe("Hello from sketch");
  });

  it("returns error from invoke failure", async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: "network" } });
    const r = await transcribeJournalSketch({ entryId: "e1", storagePath: "p" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("network");
  });

  it("returns error from response payload", async () => {
    invokeMock.mockResolvedValue({ data: { error: "Unauthorized" }, error: null });
    const r = await transcribeJournalSketch({ entryId: "e1", storagePath: "p" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Unauthorized");
  });

  it("marks skipped responses", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, body: "existing", skipped: true },
      error: null,
    });
    const r = await transcribeJournalSketch({ entryId: "e1", storagePath: "p" });
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(true);
  });
});

describe("upsertSketchAndTranscribe in-flight lock", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    uploadMock.mockReset();
    uploadMock.mockResolvedValue({
      storage_path: "u/e1/sketch-e1.png",
      photo_id: "ph1",
    });
  });

  it("dedupes concurrent calls for the same entry", async () => {
    let invokeCalls = 0;
    invokeMock.mockImplementation(async () => {
      invokeCalls += 1;
      await new Promise((r) => setTimeout(r, 10));
      return { data: { ok: true, body: "text" }, error: null };
    });

    const file = new File(["x"], "sketch.png", { type: "image/png" });
    const p1 = upsertSketchAndTranscribe("u1", "e1", file);
    const p2 = upsertSketchAndTranscribe("u1", "e1", file);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.body).toBe("text");
    expect(r2.body).toBe("text");
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(invokeCalls).toBe(1);
  });
});
