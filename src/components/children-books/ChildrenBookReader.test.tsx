import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChildrenBookReader } from "@/components/children-books/ChildrenBookReader";
import type { ChildrenBook } from "@/lib/children-books/storybook";

const layoutState = vi.hoisted(() => ({
  compactChrome: true,
  readerSpread: false,
  tabletPortrait: false,
}));

vi.mock("@/hooks/use-reader-layout", () => ({
  useReaderCompactChrome: () => layoutState.compactChrome,
  useReaderSpread: () => layoutState.readerSpread,
  useIsTabletPortrait: () => layoutState.tabletPortrait,
}));

vi.mock("@/hooks/usePreloadChildrenBookImages", () => ({
  usePreloadChildrenBookImages: vi.fn(),
}));

vi.mock("@/hooks/useGeneratePageIllustration", () => ({
  useGeneratePageIllustration: () => ({ imageUrl: "/page.webp", generating: false }),
}));

vi.mock("@/hooks/usePageImageUrl", () => ({
  usePageImageLoaded: () => ({
    loaded: true,
    failed: false,
    onLoad: vi.fn(),
    onError: vi.fn(),
  }),
}));

vi.mock("@/components/bible/BookScene", () => ({
  BookScene: ({
    leftPage,
    rightPage,
    rightPagePeek,
  }: {
    leftPage: ReactNode;
    rightPage: ReactNode;
    rightPagePeek?: number;
  }) => (
    <section data-testid="book-scene" data-right-page-peek={rightPagePeek}>
      {leftPage}
      {rightPage}
    </section>
  ),
}));

vi.mock("@/components/bible/PageFlip", () => ({
  PageFlip: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/bible/SwipePage", () => ({
  SwipePage: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/children-books/ChildrenBookArtPage", () => ({
  ChildrenBookOrnamentPage: () => <div>Ornament page</div>,
}));

vi.mock("@/components/children-books/ChildrenBookCoverSpread", () => ({
  ChildrenBookCoverSpread: ({ onOpen }: { onOpen: () => void }) => (
    <button type="button" onClick={onOpen}>
      Open cover
    </button>
  ),
}));

vi.mock("@/components/children-books/ChildrenBookStoryPage", () => ({
  ChildrenBookStoryPage: ({ page }: { page: { title: string } }) => <article>{page.title}</article>,
}));

vi.mock("@/components/children-books/ChildrenBookEndPage", () => ({
  ChildrenBookEndIllustrationPage: () => <article>Closing illustration</article>,
  ChildrenBookEndPrayerPage: () => <article>Closing prayer</article>,
}));

vi.mock("@/components/children-books/PageIllustrationSheet", () => ({
  PageIllustrationSheet: () => null,
}));

const testBook: ChildrenBook = {
  slug: "test-book",
  title: "Test Book",
  sourceNote: "Test source",
  ageRange: "Ages 4-8",
  spiritualFocus: "Faith",
  summary: "A test book",
  coverGradient: "linear-gradient(red, blue)",
  coverPrompt: "Cover",
  generationSeed: "Seed",
  closingPrayer: "Amen",
  closingIllustrationPrompt: "Closing",
  useDefaultImagePaths: true,
  pages: [
    {
      title: "Page One",
      body: "Once upon a time.",
      scriptureThread: "Thread",
      picturePrompt: "Picture",
      palette: "dawn",
      symbol: "heart",
    },
    {
      title: "Page Two",
      body: "The story continued.",
      scriptureThread: "Thread",
      picturePrompt: "Picture",
      palette: "garden",
      symbol: "light",
    },
  ],
};

describe("ChildrenBookReader", () => {
  beforeEach(() => {
    layoutState.compactChrome = true;
    layoutState.readerSpread = false;
    layoutState.tabletPortrait = false;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses compact page controls and a smaller mobile right-page peek", () => {
    render(<ChildrenBookReader book={testBook} showHubShell={false} onBackToLibrary={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Open cover" }));
    act(() => {
      vi.advanceTimersByTime(320);
    });

    expect(screen.getByTestId("book-scene")).toHaveAttribute("data-right-page-peek", "0.07");

    const controls = screen.getByRole("navigation", { name: "Story page controls" });
    expect(within(controls).getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Page One")).toBeInTheDocument();

    fireEvent.click(within(controls).getByRole("button", { name: "Next page" }));

    expect(within(controls).getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Page Two")).toBeInTheDocument();
  });

  it("returns to the cover from the first page on mobile", () => {
    render(<ChildrenBookReader book={testBook} showHubShell={false} onBackToLibrary={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Open cover" }));
    act(() => {
      vi.advanceTimersByTime(320);
    });

    const controls = screen.getByRole("navigation", { name: "Story page controls" });
    fireEvent.click(within(controls).getByRole("button", { name: "Back to cover" }));

    expect(screen.getByRole("button", { name: "Open cover" })).toBeInTheDocument();
  });
});
