import { describe, expect, it } from "vitest";
import {
  graphNodeValFromDegree,
  parseWikilinks,
  resolveWikilinks,
  resolveWikilinksToEntryIds,
} from "./wikilinks";

describe("parseWikilinks", () => {
  it("parses title links", () => {
    const links = parseWikilinks("Met with [[Sarah]] about [[Morning prayer]].");
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ target: "entry", mode: "title", title: "Sarah" });
  });

  it("parses typed prefixes", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const links = parseWikilinks(
      `[[artifact:${id}]] [[belief:${id}]] [[verse:John 3:16]]`,
    );
    expect(links).toHaveLength(3);
    expect(links[0]).toMatchObject({ target: "artifact", mode: "id", id });
    expect(links[2]).toMatchObject({ target: "verse", ref: "John 3:16" });
  });

  it("dedupes repeated links", () => {
    expect(parseWikilinks("[[Hope]] again [[hope]]")).toHaveLength(1);
  });
});

describe("resolveWikilinks", () => {
  const indexes = {
    entries: [{ id: "e1", title: "Morning prayer" }],
    artifacts: [{ id: "a1", title: "Sermon video" }],
    beliefs: [{ id: "b1", statement: "God is faithful" }],
    entities: [{ id: "k1", title: "Tim Keller" }],
  };

  it("resolves cross-type targets", () => {
    const parsed = parseWikilinks(
      "[[Morning prayer]] [[video:Sermon video]] [[belief:God is faithful]] [[person:Tim Keller]] [[verse:Rom 8:28]]",
    );
    const r = resolveWikilinks(parsed, "self", indexes);
    expect(r.entryIds).toEqual(["e1"]);
    expect(r.artifactIds).toEqual(["a1"]);
    expect(r.beliefIds).toEqual(["b1"]);
    expect(r.entityIds).toEqual(["k1"]);
    expect(r.verses).toEqual(["Rom 8:28"]);
  });

  it("resolves explicit entry ids via legacy helper", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const parsed = parseWikilinks(`[[entry:${id}]]`);
    expect(resolveWikilinksToEntryIds(parsed, "self", indexes.entries)).toEqual([id]);
  });
});

describe("graphNodeValFromDegree", () => {
  it("grows with connection count", () => {
    expect(graphNodeValFromDegree(0)).toBeLessThan(graphNodeValFromDegree(4));
  });
});
