import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import ArtifactMobilePinnedScrollChrome from "./ArtifactMobilePinnedScrollChrome";

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

const rectFor = (height: number) => ({
  x: 0,
  y: 0,
  width: 0,
  height,
  top: 0,
  right: 0,
  bottom: height,
  left: 0,
  toJSON: () => ({}),
});

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
    const panel = screen.getByText("Insight review").parentElement;
    expect(panel?.className).toMatch(/overflow-hidden/);
    expect(panel?.className).toMatch(/flex/);
  });

  it("resets pinned spacing after closing the insight panel", () => {
    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function getRect() {
        return rectFor(this.textContent?.includes("Insight review") ? 128 : 0) as DOMRect;
      });

    const { container, rerender } = renderChrome(true);
    const root = container.querySelector("[data-artifact-youtube-mobile]") as HTMLElement;

    expect(root.style.getPropertyValue("--artifact-mobile-sticky-chrome-h")).toBe("128px");

    rerender(
      <MemoryRouter>
        <div data-artifact-youtube-mobile>
          <ArtifactMobilePinnedScrollChrome
            displayTitle="A video"
            youTubeVideoId="abc123"
            insightExploreOpen={false}
            insightExplorePanel={<div>Insight review</div>}
          />
        </div>
      </MemoryRouter>,
    );

    expect(root.style.getPropertyValue("--artifact-mobile-sticky-chrome-h")).toBe("0px");
    rectSpy.mockRestore();
  });
});
