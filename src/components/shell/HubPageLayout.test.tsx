import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HubPageLayout } from "@/components/shell/HubPageLayout";

const mockUseIsMobile = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: mockUseIsMobile,
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: () => <button type="button">Open navigation</button>,
}));

describe("HubPageLayout", () => {
  beforeEach(() => mockUseIsMobile.mockReturnValue(true));

  it("uses one safe-area inset plus a compact 48px mobile toolbar", () => {
    const { container } = render(
      <HubPageLayout title="Overview" description="Your weeks at a glance">
        <div>Content</div>
      </HubPageLayout>,
    );

    const header = container.querySelector("header");
    expect(header).toHaveClass("h-[calc(3rem+var(--safe-area-inset-top))]");
    expect(header).toHaveClass("pt-[var(--safe-area-inset-top)]");
    expect(header).not.toHaveClass("h-[calc(3.5rem+var(--safe-area-inset-top))]");
  });
});
