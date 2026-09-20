import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ArtifactDetailProcessingState from "./ArtifactDetailProcessingState";
import ArtifactTranscriptFetchErrorCard, { parseTranscriptFetchError } from "./ArtifactTranscriptFetchErrorCard";

vi.mock("./ArtifactFindingHistory", () => ({ default: () => <div>Previous research history</div> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const quote = "We should study the full context before forming an opinion about the source. This is a suggestion, not proof of any teaching.";
const source = { id: "a", title: "Source", kind: "youtube", status: "error", raw_text: `[12:49] ${quote}`,
  error: "AI credits exhausted. Add credits in Settings → Workspace → Usage.", url: "https://www.youtube.com/watch?v=abc123def45", metadata: null,
  created_at: "2026-09-20T00:00:00Z" };
const base = { inFlight: false, elapsed: 0, stageLabel: {}, stageHint: {}, studyClaimsCount: 0,
  mobilePinnedPane: false, retryingFetch: false, onPasteTranscript: vi.fn(), onReanalyze: vi.fn(), onRetryFetch: vi.fn() };

describe("saved transcript during AI outage", () => {
  it("corrects the screenshot state, exposes usable excerpts, and never auto-retries", async () => {
    vi.stubGlobal("Worker", undefined);
    const retry = vi.fn(); const paste = vi.fn();
    render(<ArtifactDetailProcessingState {...base} artifact={source} onReanalyze={retry} onPasteTranscript={paste} />);
    expect(screen.getByText("Transcript saved. AI analysis unavailable.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Paste transcript/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Try fetch again/ })).not.toBeInTheDocument();
    await screen.findByText(quote);
    expect(retry).not.toHaveBeenCalled(); expect(paste).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry AI analysis" }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it("does not label a partial AI run complete or replace its saved research", async () => {
    vi.stubGlobal("Worker", undefined);
    render(<ArtifactDetailProcessingState {...base} studyClaimsCount={12} artifact={{ ...source,
      metadata: { analysis_v2: { state: "partial", completed_sections: 2, total_sections: 9 } } }} />);
    expect(screen.getByText("Analysis incomplete")).toBeInTheDocument();
    expect(screen.getByText(/2 of 9 sections processed/)).toBeInTheDocument();
    expect(screen.getByText("Previous research history")).toBeInTheDocument();
    await screen.findByText(quote);
    expect(screen.queryByText("Analysis complete")).not.toBeInTheDocument();
  });
  it("keeps the no-transcript fetch/paste recovery available", () => {
    render(<ArtifactDetailProcessingState {...base} artifact={{ ...source, raw_text: "" }} />);
    expect(screen.getByRole("button", { name: "Paste transcript" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try fetch again" })).toBeInTheDocument();
    expect(screen.queryByTestId("artifact-transcript-only-study")).not.toBeInTheDocument();
  });
  it("does not show a paste prompt while AI is pending with saved text", async () => {
    vi.stubGlobal("Worker", undefined);
    render(<ArtifactDetailProcessingState {...base} inFlight artifact={{ ...source, status: "fetching", error: null }} />);
    expect(screen.getByText("Transcript saved · AI analysis pending")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Paste/ })).not.toBeInTheDocument();
    await screen.findByText(quote);
  });
  it("also recognizes non-billing failures and never requires a second transcript", () => {
    expect(parseTranscriptFetchError("No analysis API provider is configured.", true).headline).toBe("Transcript saved. AI analysis unavailable.");
    expect(parseTranscriptFetchError("Analysis timed out", true).hint).toMatch(/no AI credits/);
    render(<ArtifactTranscriptFetchErrorCard hasTranscript error="Analysis timed out" showRetry showReanalyze onRetry={vi.fn()} onPaste={vi.fn()} onReanalyze={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Retry AI analysis" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Paste/ })).not.toBeInTheDocument();
  });
  it("removes old excerpts immediately when the transcript is replaced", async () => {
    vi.stubGlobal("Worker", undefined);
    const { rerender } = render(<ArtifactDetailProcessingState {...base} artifact={source} />);
    await screen.findByText(quote);
    const updated = "The replacement source describes a different idea and must not show excerpts from the earlier transcript.";
    rerender(<ArtifactDetailProcessingState {...base} artifact={{ ...source, raw_text: updated }} />);
    expect(screen.queryByText(quote)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(updated)).toBeInTheDocument());
  });
});
