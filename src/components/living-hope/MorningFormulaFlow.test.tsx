import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MorningWorshipMusic } from "./MorningWorshipMusic";
import { MorningScriptureActions } from "./MorningScriptureActions";
import { MorningPrayerReader } from "./MorningPrayerReader";
import { morningFormulaReaderHref, MORNING_FORMULA_SCRIPTURE_RETURN, readerReturnFromState } from "@/lib/bible/readerNavigation";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u" } }) }));
vi.mock("./MorningJournalCapture", () => ({ MorningJournalCapture: ({ entryId }: { entryId: string }) => <div data-testid="morning-capture">{entryId}</div> }));
vi.mock("./MorningFormulaInlineJournal", () => ({ MorningFormulaInlineJournal: () => <div>Optional text</div> }));
import { MorningConversationPanel } from "./MorningConversationPanel";

afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });
beforeEach(() => sessionStorage.clear());
describe("Morning Formula flow controls", () => {
  it("uses the existing saved YouTube Music track in a separate tab", () => {
    render(<MorningWorshipMusic url="https://music.youtube.com/watch?v=gUaoXqB73o8" history={[]} onChange={vi.fn()} />);
    const play = screen.getByRole("link", { name: /Play worship/ });
    expect(play.getAttribute("href")).toContain("gUaoXqB73o8");
    expect(play.getAttribute("target")).toBe("_blank");
    expect(play.getAttribute("rel")).toContain("noopener");
  });
  it("saves a named playlist from Worship without a settings detour", () => {
    const onChange = vi.fn();
    render(<MorningWorshipMusic url="" history={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Worship song or playlist link"), { target: { value: "https://www.youtube.com/playlist?list=PLMorningWorship" } });
    fireEvent.change(screen.getByLabelText("Worship music name"), { target: { value: "Morning praise" } });
    fireEvent.click(screen.getByRole("button", { name: "Save music" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ history: [expect.objectContaining({ title: "Morning praise" })] }));
  });
  it("rejects unsafe URLs", () => {
    const onChange = vi.fn();
    render(<MorningWorshipMusic url="" history={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Worship song or playlist link"), { target: { value: "javascript:alert(1)" } });
    fireEvent.click(screen.getByRole("button", { name: "Save music" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeTruthy();
  });
  it("opens Bible from the user gesture and carries the return route without opener state", () => {
    const child = { focus: vi.fn(), opener: {} };
    const open = vi.spyOn(window, "open").mockReturnValue(child as unknown as Window);
    render(<MemoryRouter><MorningScriptureActions readerHref="/reader?book=Ps&chapter=23" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Pop out Bible" }));
    const url = new URL(String(open.mock.calls[0][0]), "https://app.test");
    expect(url.searchParams.get("returnTo")).toBe(MORNING_FORMULA_SCRIPTURE_RETURN);
    expect(url.searchParams.get("chapter")).toBe("23");
    expect(child.opener).toBeNull();
    expect(child.focus).toHaveBeenCalledOnce();
  });
  it("offers a normal link when popups are blocked", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    render(<MemoryRouter><MorningScriptureActions readerHref="/reader" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Pop out Bible" }));
    expect(screen.getByRole("link", { name: "Open the Bible in a new tab" })).toBeTruthy();
  });
  it("recognizes portable return query without a stored React location", () => {
    window.history.replaceState({}, "", morningFormulaReaderHref("/reader", true));
    expect(readerReturnFromState(null)).toEqual({ to: MORNING_FORMULA_SCRIPTURE_RETURN, label: "Return to Morning Formula" });
  });
  it("does not turn an external href into an open redirect", () => {
    expect(morningFormulaReaderHref("//evil.test")).toMatch(/^\/reader\?/);
    expect(morningFormulaReaderHref("https://evil.test")).toMatch(/^\/reader\?/);
  });
  it("presents a readable personal prayer with editing secondary", () => {
    const { container } = render(<MorningPrayerReader title="Surrender" value="Father, I trust You. Guide my day." onChange={vi.fn()} />, { wrapper: TooltipProvider });
    expect(container.querySelector("article")?.textContent).toContain("Father, I trust You.");
    expect(screen.getByText("Personal prayer, not Scripture.")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit prayer" }));
    expect(screen.getByRole("textbox").getAttribute("aria-label")).toBe("Surrender prayer text");
  });
  it("opens video capture inside the SAME journal entry without a route detour", () => {
    render(<MemoryRouter><MorningConversationPanel entryId="same-entry" preview={null} busy={false} error={null} /></MemoryRouter>);
    expect(screen.getByTestId("morning-capture").textContent).toBe("same-entry");
    expect(screen.getByRole("button", { name: "Video journal" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Write instead" }));
    expect(screen.queryByTestId("morning-capture")).toBeNull();
    expect(screen.getAllByText("Optional text").length).toBeGreaterThan(0);
  });
});
