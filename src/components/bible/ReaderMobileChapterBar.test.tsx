import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReaderMobileChapterBar } from "./ReaderMobileChapterBar";
afterEach(cleanup);
const baseProps = {
  scrollMode: false, canGoBack: true, canGoForward: true,
  onBack: vi.fn(), onForward: vi.fn(), position: "absolute" as const,
};
describe("ReaderMobileChapterBar", () => {
  it("uses only small corner arrows with no center label, numbers, or pill", () => {
    const { container } = render(<ReaderMobileChapterBar {...baseProps} dockVisible={false} />);
    const bar = container.querySelector("[data-reader-chapter-bar]") as HTMLElement;
    expect(bar).toHaveClass("absolute", "justify-between", "pointer-events-none");
    expect(bar.textContent).toBe("");
    expect(bar.querySelectorAll("svg")).toHaveLength(2);
    expect(bar.querySelector(".rounded-full")).toBeNull();
    expect(bar.className).toContain("env(safe-area-inset-bottom,0px)");
    for (const button of screen.getAllByRole("button")) expect(button).toHaveClass("h-11", "w-11", "pointer-events-auto");
  });
  it("keeps directions functional and stays above the existing dock", () => {
    const back = vi.fn(), forward = vi.fn();
    const { container } = render(<ReaderMobileChapterBar {...baseProps} dockVisible position="fixed" onBack={back} onForward={forward} />);
    const bar = container.querySelector("[data-reader-chapter-bar]") as HTMLElement;
    expect(bar).toHaveClass("fixed");
    expect(bar.className).toContain("--reader-mobile-dock-h");
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(back).toHaveBeenCalledOnce();
    expect(forward).toHaveBeenCalledOnce();
  });
  it("disables navigation while drawing", () => {
    render(<ReaderMobileChapterBar {...baseProps} dockVisible={false} disabled />);
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });
  it("keeps chapter navigation accessible in scroll mode", () => {
    render(<ReaderMobileChapterBar {...baseProps} dockVisible={false} scrollMode canGoBack={false} />);
    expect(screen.getByRole("button", { name: "Previous chapter" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next chapter" })).not.toBeDisabled();
  });
});
