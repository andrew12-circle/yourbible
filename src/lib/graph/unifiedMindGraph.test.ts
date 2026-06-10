import { describe, expect, it } from "vitest";
import {
  buildUnifiedMindGraph,
  mindNodeId,
  mindNodeRoute,
} from "./unifiedMindGraph";

describe("buildUnifiedMindGraph", () => {
  it("connects journal entries to artifacts and beliefs", () => {
    const { nodes, links } = buildUnifiedMindGraph({
      entries: [{ id: "e1", title: "Sunday notes", body: "", summary: null, belief_id: null, verse_ref: null }],
      beliefs: [{ id: "b1", statement: "God is faithful", topic: "Faith" }],
      artifacts: [{ id: "a1", title: "Sermon video", kind: "youtube" }],
      entities: [],
      journalLinks: [
        { entry_id: "e1", target_kind: "artifact", target_ref: { id: "a1" } },
        { entry_id: "e1", target_kind: "belief", target_ref: { belief_id: "b1" } },
      ],
      beliefLinks: [],
      tensions: [],
      beliefSources: [],
      claims: [],
      scriptures: [],
      entityMentions: [],
    });

    expect(nodes.map((n) => n.id).sort()).toEqual(
      [mindNodeId.entry("e1"), mindNodeId.belief("b1"), mindNodeId.artifact("a1")].sort(),
    );
    expect(links.length).toBe(2);
    expect(links.some((l) => l.source === mindNodeId.entry("e1") && l.target === mindNodeId.artifact("a1"))).toBe(
      true,
    );
  });

  it("links beliefs through sources and scripture", () => {
    const { links } = buildUnifiedMindGraph({
      entries: [],
      beliefs: [{ id: "b1", statement: "Hope endures", topic: "Hope" }],
      artifacts: [{ id: "a1", title: "Book", kind: "text" }],
      entities: [],
      journalLinks: [],
      beliefLinks: [],
      tensions: [],
      beliefSources: [{ belief_id: "b1", artifact_id: "a1" }],
      claims: [],
      scriptures: [{ belief_id: "b1", ref: "Romans 5:5" }],
      entityMentions: [],
    });

    expect(links.some((l) => l.target === mindNodeId.verse("Romans 5:5"))).toBe(true);
    expect(links.some((l) => l.target === mindNodeId.artifact("a1"))).toBe(true);
  });
});

describe("mindNodeRoute", () => {
  it("routes entry nodes to journal", () => {
    expect(mindNodeRoute({ kind: "entry", ref: "abc", id: "e:abc", label: "", color: "", val: 2 })).toBe(
      "/journal/abc",
    );
  });
});
