import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import ArtifactMobilePinnedScrollChrome from "./ArtifactMobilePinnedScrollChrome";

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

function renderChrome(insightExploreOpen: boolean) {
  return render(
    <MemoryRouter>
      <div data-artifact-youtube-mobile>
        <ArtifactMobilePinnedScrollChrome
          displayTitle="A video"
          youTubeVideoId="abc123"
          insightExploreOpen={insightExploreOpen}
          insightExplorePanel={<div>Insight review</div>}
        />
      </div>
    </MemoryRouter>,
  );
}

beforeAll(() => {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
});

afterEach(() => cleanup());

describe("ArtifactMobilePinnedScrollChrome", () => {
  it("does not mount the fixed insight panel while closed", () => {
    renderChrome(false);

    expect(screen.getByText("A video")).toBeInTheDocument();
    expect(screen.queryByText("Insight review")).not.toBeInTheDocument();
  });

  it("mounts the insight panel while open", () => {
    renderChrome(true);

    expect(screen.getByText("Insight review")).toBeInTheDocument();
  });
});
