import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReaderPageMeasurement } from "@/hooks/useReaderPageMeasurement";
import { ReaderPageBodyPlaceholder, ReaderPageHeader, ReaderPageFooter } from "@/pages/reader/ReaderPageChrome";

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

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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

const headerProps = {
  side: "left" as const, scrollMode: false, compactChrome: false,
  effectiveSpread: true, globalPage: 640, pageReference: "Proverbs 3–4",
  onOpenSettings: vi.fn(),
};

describe("printed page header", () => {
  it("shows the actual chapter range with one top page number and no source copy", () => {
    const onOpenSettings = vi.fn();
    const { container } = render(<ReaderPageHeader {...headerProps} onOpenSettings={onOpenSettings} />);
    expect(container.textContent).toBe("Proverbs 3–4640");
    const number = container.querySelector("[data-reader-running-page-number]");
    expect(number).toHaveClass("left-1/2", "-translate-x-1/2");
    fireEvent.click(screen.getByRole("button", { name: /Proverbs 3–4/ }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
  it("puts the right page range at the outer right edge", () => {
    render(<ReaderPageHeader {...headerProps} side="right" pageReference="Proverbs 4–5" globalPage={641} />);
    expect(screen.getByRole("button")).toHaveStyle({ textAlign: "right" });
    expect(screen.getByLabelText("Page 641")).toBeInTheDocument();
  });
  it("also shows the top number on a compact single page", () => {
    render(<ReaderPageHeader {...headerProps} compactChrome effectiveSpread={false} />);
    expect(screen.getByLabelText("Page 640")).toBeInTheDocument();
  });
  it("does not invent page identity while content is unresolved", () => {
    const { container } = render(<ReaderPageHeader {...headerProps} pageReference={null} />);
    expect(container.textContent).toBe("");
    expect(container.querySelector("[data-reader-running-head]")).toHaveClass("h-5");
  });
  it("does not assign a print page number to continuous scrolling", () => {
    const { container } = render(<ReaderPageHeader {...headerProps} scrollMode />);
    expect(container.querySelector("[data-reader-running-page-number]")).toBeNull();
  });
});

const footerProps = {
  inkMode: false, side: "left" as const, effectiveSpread: true,
  canGoBack: true, canGoForward: true, onPrevPage: vi.fn(), onNextPage: vi.fn(),
};

describe("minimal page footer", () => {
  it.each(["left", "right"] as const)("keeps an invisible %s-page tap area without labels, arrows, or a divider", (side) => {
    const back = vi.fn(), next = vi.fn();
    const { container } = render(<ReaderPageFooter {...footerProps} side={side} onPrevPage={back} onNextPage={next} />);
    const footer = container.querySelector("[data-page-footer]");
    expect(footer?.textContent).toBe("");
    expect(footer?.querySelector("svg")).toBeNull();
    expect(footer).not.toHaveClass("border-t");
    expect(footer).toHaveClass("h-10");
    const button = screen.getByRole("button", { name: side === "left" ? "Previous page" : "Next page" });
    expect(button).not.toHaveAttribute("aria-hidden");
    fireEvent.click(button);
    expect(side === "left" ? back : next).toHaveBeenCalledOnce();
    expect(side === "left" ? next : back).not.toHaveBeenCalled();
  });
  it("uses only two corner arrows on a single page", () => {
    const { container } = render(<ReaderPageFooter {...footerProps} effectiveSpread={false} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(container.querySelectorAll("svg")).toHaveLength(2);
    expect(container.textContent).toBe("");
    expect(container.querySelector("[data-page-footer]")).toHaveClass("justify-between");
  });
  it("prevents turns while drawing, including keyboard activation", () => {
    const next = vi.fn();
    render(<ReaderPageFooter {...footerProps} side="right" inkMode onNextPage={next} />);
    expect(screen.getByRole("button")).toBeDisabled();
    fireEvent.click(screen.getByRole("button"));
    expect(next).not.toHaveBeenCalled();
  });
  it("disables unavailable directions at the book boundary", () => {
    render(<ReaderPageFooter {...footerProps} effectiveSpread={false} canGoBack={false} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();
  });
});
