import { describe, expect, it } from "vitest";
import { buildJournalCaptionSegments, resolveJournalCaptionPreview, type JournalCaptionSnapshot } from "./journalCaptionPreview";
import type { JournalVideoRow } from "./videos";
const snap = (body = "", anchor = body.length, text = "words as I speak"): JournalCaptionSnapshot => ({ id: "capture", body, anchor, text });

describe("journal-body caption preview", () => {
  it("shows cumulative speech at the recording position without changing the source text", () => {
    const original = "Before.\n\nAfter.";
    expect(resolveJournalCaptionPreview(original, snap(original, 7))).toEqual({ id: "capture", anchor: 7, text: "words as I speak" });
    expect(original).toBe("Before.\n\nAfter.");
  });
  it("normalizes interim whitespace rather than repeating incremental phrases", () => {
    expect(resolveJournalCaptionPreview("", snap("", 0, "words\n   as I speak")).text).toBe("words as I speak");
  });
  it("rebases the caption around an edit before its anchor", () => {
    const original = "Before.\n\nAfter.";
    expect(resolveJournalCaptionPreview("Changed before.\n\nAfter.", snap(original, 7)).anchor).toBe(15);
  });
  it("retains an edit after the recording position", () => {
    const original = "Before.\n\nAfter.";
    expect(resolveJournalCaptionPreview("Before.\n\nEdited after.", snap(original, 7)).anchor).toBe(7);
  });
  it("does not repeat captions already committed by the recording finalizer", () => {
    expect(resolveJournalCaptionPreview("Words as I speak.", snap()).text).toBe("");
  });
  it("hides a saved transcript appended after concurrent edits beyond the recording anchor", () => {
    const original = "Text before recording.\n\nText after recording.";
    const current = "Text before recording.\n\nMy manually edited ending.\n\nFinal spoken words.";
    expect(resolveJournalCaptionPreview(current, snap(original, 22, "Final spoken words")).text).toBe("");
  });
  it("continues after a pause checkpoint without replaying the saved prefix", () => {
    expect(resolveJournalCaptionPreview("Words as I speak.", snap("", 0, "words as I speak and now more words")))
      .toEqual({ id: "capture", anchor: 17, text: "and now more words" });
  });
  it("does not hide repeated speech just because those words were already in the original entry", () => {
    const original = "Words as I speak.";
    expect(resolveJournalCaptionPreview(original, snap(original)).text).toBe("words as I speak");
  });
  it("splits editable text at the anchor without putting speech into any text slice", () => {
    const body = "BeforeAfter";
    const segments = buildJournalCaptionSegments(body, [], { id: "capture", text: "Spoken", anchor: 6 });
    expect(segments).toEqual([
      { kind: "text", start: 0, end: 6 }, { kind: "caption", caption: { id: "capture", text: "Spoken", anchor: 6 } },
      { kind: "text", start: 6, end: 11 },
    ]);
    expect(segments.flatMap(s => s.kind === "text" ? [body.slice(s.start, s.end)] : []).join("")).toBe(body);
  });
  it("keeps existing videos and their URLs while speech changes", () => {
    const video = { id: "video", anchor_offset: 0, created_at: "2026-01-01", url: "stable-video" } as unknown as JournalVideoRow;
    const segments = buildJournalCaptionSegments("Before", [video], { id: "capture", text: "Spoken", anchor: 6 });
    expect(segments.find(s => s.kind === "video")).toEqual({ kind: "video", video });
    expect(segments.at(-1)).toEqual({ kind: "text", start: 6, end: 6 });
  });
  it("leaves the existing segmentation unchanged when there is no recording", () => {
    expect(buildJournalCaptionSegments("Normal writing", [])).toEqual([{ kind: "text", start: 0, end: 14 }]);
  });
});
