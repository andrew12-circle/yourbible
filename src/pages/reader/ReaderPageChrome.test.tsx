import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReaderPageMeasurement } from "@/hooks/useReaderPageMeasurement";
import { ReaderPageBodyPlaceholder } from "@/pages/reader/ReaderPageChrome";

function ColdCompactMeasurementHarness() {
  const { onMeasureRestRef, pageBox, paginatorReady } =
    useReaderPageMeasurement("Jhn", 1);

  return (
    <>
      <output
        data-testid="measurement-state"
        data-page-box={`${pageBox.w}x${pageBox.h}`}
        data-ready={String(paginatorReady)}
      />
      <ReaderPageBodyPlaceholder
        pageLoading
        showMeasureArticle
        measureRef={onMeasureRestRef}
        scriptureTypoClass="reader-test-type"
        articleStyle={{ fontSize: "16px" }}
      />
    </>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("ReaderPageBodyPlaceholder", () => {
  it("measures a cold compact page underneath its loading spinner", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(324);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(480);

    const { container } = render(<ColdCompactMeasurementHarness />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(container.querySelector("[data-reading-area]")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("measurement-state")).toHaveAttribute(
        "data-ready",
        "true",
      );
      expect(screen.getByTestId("measurement-state")).toHaveAttribute(
        "data-page-box",
        "324x480",
      );
    });
  });
});
