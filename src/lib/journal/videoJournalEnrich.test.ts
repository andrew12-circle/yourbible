import { describe, expect, it, vi } from "vitest";
import { enrichVideoJournalEntry } from "@/lib/journal/videoJournalEnrich";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/journal/suggestSummary", () => ({
  suggestJournalEntrySummary: (...args: unknown[]) => invokeMock(...args),
}));

describe("enrichVideoJournalEntry", () => {
  it("skips when body is too short", async () => {
    invokeMock.mockReset();
    const r = await enrichVideoJournalEntry({ entryId: "e1", body: "hi" });
    expect(r.skipped).toBe(true);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("returns summary and title from the edge function", async () => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({
      ok: true,
      summary: "- Prayed about work\n- Feeling anxious",
      title: "Processing work stress",
    });
    const body =
      "Lord I need help with work today because everything feels overwhelming and I do not know what to do next.";
    const r = await enrichVideoJournalEntry({ entryId: "e1", body });
    expect(invokeMock).toHaveBeenCalledWith({
      entryId: "e1",
      body,
      source: "video",
    });
    expect(r.summary).toContain("Prayed");
    expect(r.title).toBe("Processing work stress");
  });
});
