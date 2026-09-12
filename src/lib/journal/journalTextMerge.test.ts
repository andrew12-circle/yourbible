import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mergeJournalText, mergeVideoTranscriptSafely } from "./journalTextMerge";

describe("journal text and transcript safety", () => {
  it("preserves typing before a delayed transcript append", () => {
    assert.equal(mergeJournalText("Original", "Edited", "Original\n\nTranscript"), "Edited\n\nTranscript");
  });
  it("preserves independent edits on either side of a passage", () => {
    assert.equal(mergeJournalText("Alpha middle omega", "First middle omega", "Alpha middle last"), "First middle last");
  });
  it("refuses overlapping edits instead of making up a merged sentence", () => {
    assert.equal(mergeJournalText("Original", "My version", "Another version"), null);
  });
  it("keeps complete Unicode code points when combining independent edits", () => {
    assert.equal(mergeJournalText("😀 abc", "😅 abc", "😀 xyz"), "😅 xyz");
  });
  it("replaces only an unchanged live caption while preserving later typing", () => {
    assert.equal(mergeVideoTranscriptSafely({
      snap: { body: "Prayer", anchor: 6 }, anchor: 6,
      current: "Prayer\n\nLive words\n\nMy additional writing",
      previousTranscript: "Live words", transcript: "Final transcript words.",
    }), "Prayer\n\nFinal transcript words.\n\nMy additional writing");
  });
  it("preserves edits to a live caption itself and keeps the final transcript too", () => {
    const next = mergeVideoTranscriptSafely({
      snap: { body: "Prayer", anchor: 6 }, anchor: 6,
      current: "Prayer\n\nMy corrected caption", previousTranscript: "Live words", transcript: "Final words",
    });
    assert.equal(next, "Prayer\n\nMy corrected caption\n\nFinal words");
  });
  it("does not duplicate the final transcript on a retry", () => {
    const options = { snap: { body: "Prayer", anchor: 6 }, anchor: 6, transcript: "Final words", previousTranscript: "Live" };
    const first = mergeVideoTranscriptSafely({ ...options, current: "Prayer\n\nLive" });
    assert.equal(mergeVideoTranscriptSafely({ ...options, current: first }), first);
  });
  it("never replaces a video-first entry's unrelated text when no snapshot exists", () => {
    assert.equal(mergeVideoTranscriptSafely({ current: "My unrelated text", transcript: "Recorded words", anchor: 0, snap: null }), "My unrelated text\n\nRecorded words");
  });
  it("preserves typing made after capture began but before a live upload checkpoint", () => {
    assert.equal(mergeVideoTranscriptSafely({
      current: "Prayer\n\nTyped while recording", transcript: "Captured speech", anchor: 6, snap: { body: "Prayer", anchor: 6 },
    }), "Prayer\n\nTyped while recording\n\nCaptured speech");
  });
});
