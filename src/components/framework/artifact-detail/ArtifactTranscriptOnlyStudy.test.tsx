import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ArtifactTranscriptOnlyStudy from "./ArtifactTranscriptOnlyStudy";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const quote = "Read the entire argument before drawing a conclusion. John 3:16 is mentioned here but that does not verify the speaker's claim.";

describe("transcript-only study panel", () => {
  it("shows local excerpts without AI requests and seeks only after a click", async () => {
    vi.stubGlobal("Worker", undefined);
    const fetch = vi.fn(() => { throw new Error("Network forbidden"); });
    vi.stubGlobal("fetch", fetch);
    const onSeek = vi.fn();
    render(<ArtifactTranscriptOnlyStudy artifactId="a" text={`[12:49] ${quote}`} onSeek={onSeek} />);
    expect(screen.getByText(/No AI credits required/)).toBeInTheDocument();
    expect(await screen.findByText(quote)).toBeInTheDocument();
    expect(screen.getByText(/not AI findings/)).toBeInTheDocument();
    expect(onSeek).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Play from 12:49" }));
    expect(onSeek).toHaveBeenCalledWith(769);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not create a timestamp button for untimed sources", async () => {
    vi.stubGlobal("Worker", undefined);
    render(<ArtifactTranscriptOnlyStudy artifactId="a" text={quote} onSeek={vi.fn()} />);
    await screen.findByText(quote);
    expect(screen.getByText("No timestamp")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Play/ })).not.toBeInTheDocument();
  });
  it("leaves successful AI findings unobstructed and opens when analysis becomes unavailable", async () => {
    vi.stubGlobal("Worker", undefined);
    const { rerender } = render(<ArtifactTranscriptOnlyStudy artifactId="a" text={quote} initiallyOpen={false} />);
    expect(screen.getByRole("button", { name: "Show excerpts" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(quote)).not.toBeInTheDocument();
    rerender(<ArtifactTranscriptOnlyStudy artifactId="a" text={quote} initiallyOpen />);
    await screen.findByText(quote);
    fireEvent.click(screen.getByRole("button", { name: "Hide excerpts" }));
    rerender(<ArtifactTranscriptOnlyStudy artifactId="a" text={quote} initiallyOpen />);
    expect(screen.getByRole("button", { name: "Show excerpts" })).toHaveAttribute("aria-expanded", "false");
  });
  it("copies only the source excerpt and reports clipboard rejection without losing text", async () => {
    vi.stubGlobal("Worker", undefined);
    const writeText = vi.fn().mockRejectedValue(new Error("Denied"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ArtifactTranscriptOnlyStudy artifactId="a" text={`[0:00] ${quote}`} />);
    await screen.findByText(quote);
    fireEvent.click(screen.getByRole("button", { name: "Copy excerpt 1" }));
    await waitFor(() => expect(screen.getByText(/Could not copy/)).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith(quote);
    expect(screen.getByText(quote)).toBeInTheDocument();
  });
});
