import { describe, expect, it } from "vitest";
import { resolveCitationLink } from "./citationLink";

describe("resolveCitationLink", () => {
  it("opens YouTube watch URL with timestamp for video artifacts", () => {
    const link = resolveCitationLink({
      source_type: "artifact",
      id: "abcabcab-1234-5678-9abc-abcabcabcabc",
      label: "How To Activate The Four Winds",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      start_seconds: 90,
    });
    expect(link?.external).toBe(true);
    expect(link?.href).toContain("dQw4w9WgXcQ");
    expect(link?.href).toMatch(/t=90s/);
  });

  it("falls back to artifact page when no YouTube url is known", () => {
    const id = "abcabcab-1234-5678-9abc-abcabcabcabc";
    const link = resolveCitationLink({
      source_type: "artifact",
      id,
      label: "Saved PDF",
    });
    expect(link).toEqual({ href: `/framework/artifacts/${id}`, external: false });
  });

  it("uses backfilled artifact urls from the hook map", () => {
    const id = "abcabcab-1234-5678-9abc-abcabcabcabc";
    const link = resolveCitationLink(
      { source_type: "artifact", id, label: "Francis Myles teaching" },
      { [id]: "https://www.youtube.com/watch?v=abc123def45" },
    );
    expect(link?.external).toBe(true);
    expect(link?.href).toBe("https://www.youtube.com/watch?v=abc123def45");
  });
});
