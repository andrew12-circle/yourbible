import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ArtifactDetailProcessingState from "./ArtifactDetailProcessingState";

const artifact = {
  id: "artifact-1",
  title: "A saved video",
  kind: "youtube",
  status: "ready",
  error: null,
  raw_text: "",
  url: "https://www.youtube.com/watch?v=abc123def45",
  metadata: null,
  created_at: "2026-01-01T00:00:00Z",
};

function renderState(rawText = "") {
  const onRetryFetch = vi.fn();
  const onPasteTranscript = vi.fn();

  render(
    <ArtifactDetailProcessingState
      artifact={{ ...artifact, raw_text: rawText }}
      inFlight={false}
      elapsed={0}
      stageLabel={{}}
      stageHint={{}}
      studyClaimsCount={0}
      mobilePinnedPane
      retryingFetch={false}
      onPasteTranscript={onPasteTranscript}
      onReanalyze={vi.fn()}
      onRetryFetch={onRetryFetch}
    />,
  );

  return { onRetryFetch, onPasteTranscript };
}

describe("ArtifactDetailProcessingState", () => {
  it("gives a saved YouTube video without study output a visible recovery path", () => {
    const { onRetryFetch, onPasteTranscript } = renderState();

    expect(screen.getByTestId("artifact-transcript-recovery")).toHaveTextContent(
      "Transcript hasn't arrived yet",
    );

    fireEvent.click(screen.getByRole("button", { name: "Try fetch again" }));
    fireEvent.click(screen.getByRole("button", { name: "Paste transcript" }));

    expect(onRetryFetch).toHaveBeenCalledOnce();
    expect(onPasteTranscript).toHaveBeenCalledOnce();
  });

  it("does not show the recovery card once the transcript is present", () => {
    renderState("A real transcript is ready.");

    expect(screen.queryByTestId("artifact-transcript-recovery")).not.toBeInTheDocument();
  });
});
