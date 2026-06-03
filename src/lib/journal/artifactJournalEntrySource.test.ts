import { describe, expect, it } from "vitest";
import {
  ARTIFACT_JOURNAL_SOURCE_END,
  ARTIFACT_JOURNAL_SOURCE_START,
  buildArtifactJournalSourceMarkdown,
  composeArtifactJournalBody,
  splitArtifactJournalBody,
} from "./artifactJournalEntrySource";

describe("artifactJournalEntrySource", () => {
  it("builds a markdown source block with title, image, and channel", () => {
    const block = buildArtifactJournalSourceMarkdown({
      entryTitle: "My Video",
      channel: "Test Channel",
      channelUrl: "https://youtube.com/channel/test",
      thumbnailUrl: "https://example.com/thumb.jpg",
    });
    expect(block).toContain(ARTIFACT_JOURNAL_SOURCE_START);
    expect(block).toContain(ARTIFACT_JOURNAL_SOURCE_END);
    expect(block).toContain("## My Video");
    expect(block).toContain("![Test Channel](https://example.com/thumb.jpg)");
    expect(block).toContain("[Test Channel](https://youtube.com/channel/test)");
  });

  it("splits stored body into notes without the source block", () => {
    const composed = composeArtifactJournalBody("My notes here.", {
      entryTitle: "T",
      channel: "C",
    });
    const { notes, hasSourceBlock } = splitArtifactJournalBody(composed);
    expect(hasSourceBlock).toBe(true);
    expect(notes).toBe("My notes here.");
  });
});
