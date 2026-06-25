import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ArtifactTranscriptFetchErrorCard, {
  parseTranscriptFetchError,
} from "./ArtifactTranscriptFetchErrorCard";

afterEach(() => cleanup());

describe("parseTranscriptFetchError", () => {
  it("handles rate limit with transcript-saved hint", () => {
    const parsed = parseTranscriptFetchError(
      "Rate limited — wait 2 minutes, then tap Re-analyze once.",
    );
    expect(parsed.headline).toMatch(/rate limit/i);
    expect(parsed.hint).toMatch(/insight cards are already visible/i);
    expect(parsed.attempts).toBeNull();
  });

  it("splits headline, attempts, and hint", () => {
    const parsed = parseTranscriptFetchError(
      "Could not fetch transcript: Could not fetch transcript. Attempts: Cache: miss; Transcript worker: skipped. YouTube blocks our servers for this video. Tap retry.",
    );
    expect(parsed.headline).toBe("Could not fetch transcript.");
    expect(parsed.attempts).toContain("Cache: miss");
    expect(parsed.hint).toMatch(/YouTube blocks/);
  });
});

describe("ArtifactTranscriptFetchErrorCard", () => {
  it("shows actions before collapsed technical details", () => {
    render(
      <ArtifactTranscriptFetchErrorCard
        error="Could not fetch transcript. Attempts: Cache: miss; Captions: empty."
        showRetry
        onRetry={vi.fn()}
        onPaste={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Try fetch again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Paste transcript/i })).toBeInTheDocument();
    expect(screen.getByText("Technical details")).toBeInTheDocument();
    const details = screen.getByText("Technical details").closest("details");
    expect(details).not.toHaveAttribute("open");
  });
});
