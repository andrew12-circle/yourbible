import { describe, expect, it } from "vitest";
import {
  graphNodeValFromDegree,
  parseWikilinks,
  resolveWikilinksToEntryIds,
} from "./wikilinks";

describe("parseWikilinks", () => {
  it("parses title links", () => {
    const links = parseWikilinks("Met with [[Sarah]] about [[Morning prayer]].");
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ kind: "title", title: "Sarah" });
    expect(links[1]).toMatchObject({ kind: "title", title: "Morning prayer" });
  });

  it("parses entry and journal uuid prefixes", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const links = parseWikilinks(`See [[entry:${id}]] and [[journal:${id}]].`);
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ kind: "entry_id", entryId: id });
  });

  it("dedupes repeated links", () => {
    const links = parseWikilinks("[[Hope]] again [[hope]].");
    expect(links).toHaveLength(1);
  });
});

describe("resolveWikilinksToEntryIds", () => {
  const index = [
    { id: "a", title: "Morning prayer" },
    { id: "b", title: "Evening reflection" },
  ];

  it("resolves titles and skips self", () => {
    const parsed = parseWikilinks("[[Morning prayer]] [[Evening reflection]]");
    const ids = resolveWikilinksToEntryIds(parsed, "a", index);
    expect(ids).toEqual(["b"]);
  });

  it("resolves explicit entry ids", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const parsed = parseWikilinks(`[[entry:${id}]]`);
    expect(resolveWikilinksToEntryIds(parsed, "self", index)).toEqual([id]);
  });
});

describe("graphNodeValFromDegree", () => {
  it("grows with connection count", () => {
    expect(graphNodeValFromDegree(0)).toBeLessThan(graphNodeValFromDegree(4));
    expect(graphNodeValFromDegree(4)).toBeLessThan(graphNodeValFromDegree(16));
  });
});
