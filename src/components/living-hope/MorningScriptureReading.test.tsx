import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MorningScriptureReading } from "./MorningScriptureReading";
import { API_BIBLE_CSB_ID } from "@/lib/bible/bibleEditions";
const mocks = vi.hoisted(() => ({ passage: vi.fn(), userId: "reader", bibles: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: mocks.userId } }) }));
vi.mock("@/hooks/usePassage", () => ({ usePassage: mocks.passage }));
vi.mock("@/hooks/useBibles", async (original) => ({ ...await original<typeof import("@/hooks/useBibles")>(), useBibles: mocks.bibles }));
const scripture = { source: "daily" as const, reference: "John 14:1-6", readerHref: "/read/Jhn/1", passage: "UNVERIFIED PREVIEW MUST NOT APPEAR" };
const props = { scripture, busy: false, error: null, onRetry: vi.fn(), reflection: "", onReflectionChange: vi.fn() };
beforeEach(() => {
  localStorage.clear(); mocks.userId = "reader"; vi.clearAllMocks();
  mocks.bibles.mockReturnValue({ data: [{ id: API_BIBLE_CSB_ID, name: "Christian Standard Bible", abbreviation: "CSB" }], isPending: false, refetch: vi.fn() });
  mocks.passage.mockReturnValue({ data: { reference: "John 14", verses: [{ number: 1, text: "Verified verse fixture" }], paragraphStarts: [1], headings: [] }, refetch: vi.fn() });
});
afterEach(cleanup);
describe("Reading without leaving the morning", () => {
  it("does not load Bible text in physical mode", () => {
    render(<MemoryRouter><MorningScriptureReading {...props} /></MemoryRouter>);
    expect(mocks.passage).not.toHaveBeenCalled();
    expect(screen.queryByText(/UNVERIFIED/)).toBeNull();
  });
  it("loads the exact verified chapter, not a route fallback or generated preview", () => {
    render(<MemoryRouter><MorningScriptureReading {...props} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Read here" }));
    expect(mocks.passage).toHaveBeenCalledWith(API_BIBLE_CSB_ID, "Jhn", 14, true, "CSB");
    expect(screen.getByText("Verified verse fixture")).toBeTruthy();
    expect(screen.queryByText(/UNVERIFIED/)).toBeNull();
    expect(screen.getByRole("article").className).not.toContain("line-clamp");
    expect(localStorage.getItem("yb-morning-reading:reader")).toBe("app");
  });
  it("does not carry the reading preference into another account", () => {
    const { rerender } = render(<MemoryRouter><MorningScriptureReading {...props} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Read here" }));
    mocks.userId = "other-reader";
    rerender(<MemoryRouter><MorningScriptureReading {...props} /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "My physical Bible" })).toHaveAttribute("aria-pressed", "true");
  });
  it("shows a loading error instead of preview text when verified delivery fails", () => {
    mocks.passage.mockReturnValue({ error: new Error("Network"), refetch: vi.fn() });
    render(<MemoryRouter><MorningScriptureReading {...props} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Read here" }));
    expect(screen.getByRole("alert").textContent).toContain("No substitute text");
  });
});
