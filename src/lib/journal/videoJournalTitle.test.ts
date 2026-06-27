import { describe, expect, it } from "vitest";
import {
  deriveVideoJournalTitleFromBody,
  formatVideoJournalStamp,
  pickLiveVideoJournalTitle,
} from "./videoJournalTitle";

describe("formatVideoJournalStamp", () => {
  it("prefixes with Video journal and includes date parts", () => {
    const stamp = formatVideoJournalStamp(new Date("2026-06-27T15:30:00"));
    expect(stamp).toMatch(/^Video journal ·/);
    expect(stamp).toContain("Jun");
    expect(stamp).toContain("27");
  });
});

describe("deriveVideoJournalTitleFromBody", () => {
  it("uses the opening sentence from transcript prose", () => {
    const body = "Today I felt peace even though work was overwhelming and loud.";
    expect(deriveVideoJournalTitleFromBody(body)).toMatch(/^Today I felt peace/);
  });

  it("returns empty for very short transcript", () => {
    expect(deriveVideoJournalTitleFromBody("Hi there")).toBe("");
  });
});

describe("pickLiveVideoJournalTitle", () => {
  const stamp = "Video journal · Sat, Jun 27 · 3:45 PM";

  it("starts with stamp when title is empty", () => {
    expect(pickLiveVideoJournalTitle("", "", stamp)).toBe(stamp);
  });

  it("upgrades stamp to body excerpt when enough transcript exists", () => {
    const body = "Grateful for how God showed up in my morning prayer time today.";
    expect(pickLiveVideoJournalTitle(stamp, body, stamp)).toMatch(/^Grateful for how God/);
  });

  it("keeps a user-written title", () => {
    const body = "Grateful for how God showed up in my morning prayer time today.";
    expect(pickLiveVideoJournalTitle("My custom title", body, stamp)).toBeNull();
  });
});
