import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScripturePlate } from "@/components/bible/ScripturePlate";
import { PageFlip } from "@/components/bible/PageFlip";
import { inlinePlatesForChapter } from "@/lib/bible/chapterContext";
import { renderReaderScrollStream } from "@/pages/reader/renderReaderScrollStream";

describe("stable chapter illustrations", () => {
  it("retries a failed image and resets failure for another artwork", () => {
    const plate = inlinePlatesForChapter("Gen", 1)[0];
    const next = inlinePlatesForChapter("Gen", 2)[0];
    const { rerender } = render(<ScripturePlate plate={plate} compact />);
    fireEvent.error(screen.getByRole("img"));
    fireEvent.click(screen.getByRole("button", { name: "Retry illustration" }));
    expect(screen.getByRole("img").getAttribute("src")).toContain("?retry=1");
    fireEvent.error(screen.getByRole("img"));
    rerender(<ScripturePlate plate={next} compact />);
    expect(screen.queryByRole("button", { name: "Retry illustration" })).toBeNull();
    expect(screen.getByRole("img").getAttribute("alt")).toBe(next.alt);
  });
  it("places mid-chapter artwork between the correct verses in scroll mode", () => {
    const ch = { bookAbbr: "Gen", bookName: "Genesis", chapter: 4, verses: Array.from({ length: 10 }, (_, i) => ({ number: i + 1, text: `Synthetic verse ${i + 1}` })), paragraphStarts: [1], headings: [], poetryBlocks: [] };
    const { container } = render(<div>{renderReaderScrollStream([ch], (groups) => groups.flatMap((g) => g.verses.map((v) => <span key={v.number} data-test-verse={v.number}>{v.text}</span>)))}</div>);
    const ordered = Array.from(container.querySelectorAll("[data-test-verse], [data-reader-plate]")).map((el) => el.getAttribute("data-test-verse") ?? el.getAttribute("data-reader-plate"));
    const middle = inlinePlatesForChapter("Gen", 4).find((p) => p.beforeVerse === 8)!;
    expect(ordered.indexOf(middle.id)).toBeGreaterThan(ordered.indexOf("7"));
    expect(ordered.indexOf(middle.id)).toBeLessThan(ordered.indexOf("8"));
    expect(container.querySelectorAll("[data-test-verse]")).toHaveLength(10);
  });
  it("holds a complete page during remeasurement but never under a different chapter", () => {
    const { container, rerender } = render(<PageFlip direction="forward" pageKey="p1" scopeKey="John3" ready><p>Chapter three</p></PageFlip>);
    rerender(<PageFlip direction="forward" pageKey="p1" scopeKey="John3" ready={false}><p>Measuring</p></PageFlip>);
    expect(container.textContent).toBe("Chapter three"); expect(container.querySelector("[inert]")).not.toBeNull();
    rerender(<PageFlip direction="forward" pageKey="p1" scopeKey="John4" ready={false}><p>Loading chapter four</p></PageFlip>);
    expect(container.textContent).toBe("Loading chapter four");
  });
});
