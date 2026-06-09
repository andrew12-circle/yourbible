import { describe, expect, it } from "vitest";
import { buildArtifactCastMembers } from "./artifactCast";

describe("buildArtifactCastMembers", () => {
  it("places host first with channel avatar, then guests, then transcript mentions", () => {
    const cast = buildArtifactCastMembers(
      {
        channel_title: "The Bible Project",
        channel_thumbnail_url: "https://example.com/host.jpg",
        interview_guests: ["Tim Mackie", "Moses"],
      },
      [
        {
          confidence: 0.9,
          knowledge_entities: {
            id: "e1",
            title: "Abraham",
            avatar_url: "https://example.com/abraham.jpg",
          },
        },
      ],
    );

    expect(cast[0]).toMatchObject({
      title: "The Bible Project",
      kind: "host",
      avatarUrl: "https://example.com/host.jpg",
    });
    expect(cast.some((c) => c.title === "Tim Mackie" && c.kind === "guest")).toBe(true);
    expect(cast.some((c) => c.title === "Moses" && c.kind === "guest")).toBe(true);
    expect(cast.some((c) => c.title === "Abraham" && c.entityId === "e1")).toBe(true);
  });

  it("merges guest row with matching entity and keeps host avatar", () => {
    const cast = buildArtifactCastMembers(
      {
        channel_title: "Podcast Host",
        channel_thumbnail_url: "https://example.com/host.jpg",
        guests: "Paul",
      },
      [
        {
          confidence: 0.85,
          knowledge_entities: {
            id: "e2",
            title: "Paul",
            avatar_url: "https://example.com/paul.jpg",
          },
        },
      ],
    );

    const paul = cast.find((c) => c.title === "Paul");
    expect(paul).toMatchObject({
      kind: "guest",
      entityId: "e2",
      avatarUrl: "https://example.com/paul.jpg",
      mentionCount: 1,
    });
    expect(cast.filter((c) => c.title === "Paul")).toHaveLength(1);
  });
});
