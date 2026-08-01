import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReaderMobileChapterBar } from "./ReaderMobileChapterBar";

afterEach(cleanup);

const baseProps = {
  bookName: "John",
  chapter: 6,
  scrollMode: false,
  globalPage: 658,
  canGoBack: true,
  canGoForward: true,
  onBack: vi.fn(),
  onForward: vi.fn(),
  onOpenSettings: vi.fn(),
  position: "absolute" as const,
};

describe("ReaderMobileChapterBar", () => {
  it("uses a compact local overlay when the hub has no reader dock", () => {
    const { container } = render(<ReaderMobileChapterBar {...baseProps} dockVisible={false} />);

    const bar = container.querySelector("[data-reader-chapter-bar]") as HTMLElement;
    const controls = bar.firstElementChild as HTMLElement;
    expect(bar).toHaveClass("absolute");
    expect(bar.className).toContain("bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]");
    expect(bar.className).not.toContain("--reader-mobile-dock-h");
    expect(controls).toHaveClass("w-fit");
    expect(controls).not.toHaveClass("w-full");
  });

  it("sits above the actual dock and preserves its controls", () => {
    const onOpenSettings = vi.fn();
    const { container } = render(
      <ReaderMobileChapterBar {...baseProps} dockVisible position="fixed" onOpenSettings={onOpenSettings} />,
    );

    const bar = container.querySelector("[data-reader-chapter-bar]") as HTMLElement;
    expect(bar).toHaveClass("fixed");
    expect(bar.className).toContain("--reader-mobile-dock-h");

    fireEvent.click(screen.getByRole("button", { name: /open reader settings/i }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
