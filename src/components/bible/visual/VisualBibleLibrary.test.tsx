import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SEED_VISUALS } from "@/lib/visualBible/seed";
import { VisualBibleLibrary } from "./VisualBibleLibrary";
import { VisualImage } from "./VisualImage";

afterEach(cleanup);
describe("visual library interaction", () => {
  it("shows bounded lazy thumbnails, pages and resets pagination when filtering", () => {
    const assets = Array.from({ length: 55 }, (_, n) => ({ ...SEED_VISUALS[0], id: `sample-${n}` }));
    render(<MemoryRouter><VisualBibleLibrary assets={assets} /></MemoryRouter>);
    expect(screen.getAllByRole("article")).toHaveLength(24);
    expect(screen.getAllByRole("img").every((image) => image.getAttribute("loading") === "lazy")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("55 visuals · Page 2 of 3")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Artemisia" } });
    expect(screen.getByText("55 visuals · Page 1 of 3")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no match" } });
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByRole("article")).toHaveLength(24);
  });
  it("filters categories and scope, then resets when the reader changes chapter", () => {
    const view = render(<MemoryRouter><VisualBibleLibrary assets={SEED_VISUALS} book="Luk" chapter={7} /></MemoryRouter>);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "View Glass gold-band perfume bottle" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Entire library" }));
    fireEvent.click(screen.getByRole("button", { name: "Artifacts (5)" }));
    expect(screen.getAllByRole("article")).toHaveLength(5);
    view.rerender(<MemoryRouter><VisualBibleLibrary assets={SEED_VISUALS} book="Gen" chapter={3} /></MemoryRouter>);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "View Adam and Eve" })).toBeInTheDocument();
  });
  it("opens detail only on request, includes rights and restores keyboard focus", async () => {
    render(<MemoryRouter><VisualBibleLibrary assets={SEED_VISUALS} /></MemoryRouter>);
    expect(document.querySelector('img[src$="-detail.webp"]')).toBeNull();
    const opener = screen.getByRole("button", { name: "View The Hundred Guilder Print" });
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", "/visual-bible/v1/met-371732-1-detail.webp");
    expect(within(dialog).getByRole("link", { name: "Matthew 19" })).toHaveAttribute("href", "/read/Mat/19");
    expect(within(dialog).getByRole("link", { name: "License terms" })).toHaveAttribute("href", "https://creativecommons.org/publicdomain/zero/1.0/");
    fireEvent.click(within(dialog).getByRole("button", { name: "Zoom in" }));
    expect(within(dialog).getByText("150%")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });
  it("supports retry and clears image failure when the source changes", () => {
    const view = render(<VisualImage src="/a.webp" alt="First image" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("status")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry image" }));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/a.webp?retry=1");
    fireEvent.error(screen.getByRole("img"));
    view.rerender(<VisualImage src="/b.webp" alt="Second image" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/b.webp");
  });
});
