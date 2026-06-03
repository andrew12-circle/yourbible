import { describe, expect, it } from "vitest";
import {
  appendJournalTimestampToNotes,
  buildJournalTimestampInsert,
  composeJournalNotesWithTimestampBlocks,
  extractJournalTimestampBlocks,
  formatJournalTimestampBlock,
  parseJournalTimestampMarkers,
  parseJournalPlaybackClock,
  stripJournalTimestampBlocks,
} from "./artifactJournalTimestamps";
import type { TranscriptSegment } from "@/lib/transcriptSplit";

const segments: TranscriptSegment[] = [
  { id: "a", text: "Hello world", startSeconds: 0, isParagraphBreak: false },
  { id: "b", text: "Second line", startSeconds: 30, isParagraphBreak: false },
  { id: "c", text: "Third line", startSeconds: 60, isParagraphBreak: false },
];

describe("artifactJournalTimestamps", () => {
  it("parses clock strings", () => {
    expect(parseJournalPlaybackClock("2:05")).toBe(125);
    expect(parseJournalPlaybackClock("1:02:05")).toBe(3725);
  });

  it("formats and parses timestamp blocks with transcript", () => {
    const block = formatJournalTimestampBlock(125, ["Hello world", "Second line"]);
    const notes = appendJournalTimestampToNotes("", block);
    const markers = parseJournalTimestampMarkers(notes);
    expect(markers).toHaveLength(1);
    expect(markers[0].seconds).toBe(125);
    expect(markers[0].clock).toBe("2:05");
    expect(markers[0].transcriptLines).toEqual(["Hello world", "Second line"]);
  });

  it("parses legacy bracket stamps", () => {
    const markers = parseJournalTimestampMarkers("Notes\n\n[2:05]\n\nMore");
    expect(markers).toHaveLength(1);
    expect(markers[0].seconds).toBe(125);
  });

  it("builds insert with transcript context from segments", () => {
    const block = buildJournalTimestampInsert(35, segments);
    const markers = parseJournalTimestampMarkers(block);
    expect(markers[0].transcriptLines.length).toBeGreaterThan(0);
  });

  it("strips timestamp blocks for the typing surface while preserving blocks on compose", () => {
    const block = formatJournalTimestampBlock(125, ["Hello world"]);
    const stored = composeJournalNotesWithTimestampBlocks("My journal notes.", [block]);
    expect(stripJournalTimestampBlocks(stored)).toBe("My journal notes.");
    expect(parseJournalTimestampMarkers(stored)).toHaveLength(1);
    expect(composeJournalNotesWithTimestampBlocks("Edited.", extractJournalTimestampBlocks(stored))).toBe(
      `${block}\n\nEdited.`,
    );
  });
});
