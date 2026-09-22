import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReaderPageMeasurement } from "@/hooks/useReaderPageMeasurement";
import { ReaderPageBodyPlaceholder, ReaderPageHeader } from "@/pages/reader/ReaderPageChrome";

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

describe("printed page header", () => {
  it("contains only the book and page number, not edition/provider/layout copy", () => {
    const onOpenSettings = vi.fn();
    const { container } = render(<ReaderPageHeader side="left" scrollMode={false} compactChrome={false} effectiveSpread globalPage={640} pageBookName="Psalms" onOpenSettings={onOpenSettings} />);
    expect(container.textContent).toBe("Psalms640");
    fireEvent.click(screen.getByRole("button", { name: /Psalms/ }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
