import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MorningSessionHero } from "./MorningSessionHero";
import { MorningWorshipMusic } from "./MorningWorshipMusic";
import { MorningWorshipGuide } from "./MorningWorshipGuide";
import { LivingHopeChrome } from "./LivingHopeChrome";
import { upsertWorshipMusicHistory } from "@/lib/livingHope/worshipMusic";
import type { RitualStep } from "@/lib/livingHope/morningRitual";

vi.mock("@/hooks/useAppShellMode", () => ({ useAppShellMode: () => ({ showHubShell: true }) }));
vi.mock("@/hooks/useKeyboardInset", () => ({ useVisualViewportMetrics: () => ({ viewportHeight: 844 }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const steps: RitualStep[] = [{ kind: "intro" }, { kind: "worship" }, { kind: "thanksgiving" }, { kind: "scripture" }, { kind: "done" }];
const navigation = { steps, stepIndex: 1, goalTotal: 0, onStepIndexChange: vi.fn() };
const firstUrl = "https://www.youtube.com/watch?v=gUaoXqB73o8";
const secondUrl = "https://www.youtube.com/playlist?list=PLMorningWorship";
function savedMusic() {
  const history = upsertWorshipMusicHistory(upsertWorshipMusicHistory([], secondUrl), firstUrl);
  return history.map((item, index) => ({ ...item, title: index === 0 ? "Morning worship" : "Instrumental prayer" }));
}

describe("Morning Formula sunrise presentation", () => {
  it("uses the real activity count and one accessible heading", () => {
    render(<MorningSessionHero {...navigation} title="Worship" subtitle="Take a breath." />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuemax")).toBe("3");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
  });
  it("keeps future steps locked while allowing a previous step", () => {
    const onStepIndexChange = vi.fn();
    render(<MorningSessionHero {...navigation} stepIndex={2} onStepIndexChange={onStepIndexChange} title="Gratitude" />);
    fireEvent.click(screen.getByText("All steps"));
    const menu = screen.getByRole("list", { name: "Morning formula steps" });
    const options = within(menu).getAllByRole("button");
    expect(options[2].hasAttribute("disabled")).toBe(true);
    fireEvent.click(options[2]);
    expect(onStepIndexChange).not.toHaveBeenCalled();
    fireEvent.click(options[0]);
    expect(onStepIndexChange).toHaveBeenCalledWith(1);
    expect(menu.closest("details")?.open).toBe(false);
  });
  it("disables all jumps during a save", () => {
    render(<MorningSessionHero {...navigation} stepIndex={2} title="Gratitude" disabled />);
    fireEvent.click(screen.getByText("All steps"));
    for (const button of within(screen.getByRole("list", { name: "Morning formula steps" })).getAllByRole("button")) {
      expect(button.hasAttribute("disabled")).toBe(true);
    }
  });
  it("closes the step menu on Escape and returns focus", () => {
    render(<MorningSessionHero {...navigation} title="Worship" />);
    const summary = screen.getByText("All steps");
    fireEvent.click(summary);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(summary.closest("details")?.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });
  it("focuses the new heading without leaving the session scroll area", () => {
    const onStepIndexChange = vi.fn();
    const view = render(<MemoryRouter><LivingHopeChrome session stepKey="worship" hero={<MorningSessionHero {...navigation} title="Worship" />}>Body</LivingHopeChrome></MemoryRouter>);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Worship" }));
    view.rerender(<MemoryRouter><LivingHopeChrome session stepKey="thanksgiving" hero={<MorningSessionHero {...navigation} stepIndex={2} onStepIndexChange={onStepIndexChange} title="Gratitude" />}>Body</LivingHopeChrome></MemoryRouter>);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Gratitude" }));
  });
  it("does not apply session scenery to the builder or other pages", () => {
    const { container } = render(<MemoryRouter><LivingHopeChrome title="Builder">Edit your morning</LivingHopeChrome></MemoryRouter>);
    expect(container.querySelector(".morning-session")).toBeNull();
    expect(container.querySelector(".morning-session-hero")).toBeNull();
  });
  it("preserves all four prayer phases and the original time allocations", () => {
    render(<MorningWorshipGuide stepBudgetMs={600_000} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "4. Respond" })).toBeTruthy();
    for (const time of ["~1:30", "~2:30", "~4 min", "~2 min"]) expect(screen.getByText(time)).toBeTruthy();
    expect(screen.queryByText("ROMANS 12:1")).toBeNull();
  });
  it("does not invent time allocations for an untimed session", () => {
    render(<MorningWorshipGuide stepBudgetMs={0} />);
    expect(screen.queryByText(/^~/)).toBeNull();
  });
});

describe("Sunrise worship music controls", () => {
  it("keeps playback an honest external link and does not autoplay", () => {
    const { container } = render(<MorningWorshipMusic url={firstUrl} history={savedMusic()} onChange={vi.fn()} />);
    const play = screen.getByRole("link", { name: "Play worship" });
    expect(play.getAttribute("href")).toBe(firstUrl);
    expect(play.getAttribute("target")).toBe("_blank");
    expect(play.getAttribute("rel")).toContain("noopener");
    expect(container.querySelector("iframe, audio, video, input[type=range]")).toBeNull();
  });
  it("switches an actual saved playlist without opening another tab", () => {
    const history = savedMusic();
    const onChange = vi.fn();
    const open = vi.spyOn(window, "open");
    render(<MorningWorshipMusic url={firstUrl} history={history} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Instrumental prayer" }));
    expect(onChange).toHaveBeenCalledWith({ url: secondUrl, history });
    expect(open).not.toHaveBeenCalled();
  });
  it("uses a local artwork fallback when the thumbnail fails", () => {
    const { container } = render(<MorningWorshipMusic url={firstUrl} history={savedMusic()} onChange={vi.fn()} />);
    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    fireEvent.error(image!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".morning-music-art-fallback")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Play worship" })).toBeTruthy();
  });
  it("offers a usable empty state without fake quick playlists", () => {
    render(<MorningWorshipMusic url="" history={[]} onChange={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: "Worship song or playlist link" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Quick playlists" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Play worship" })).toBeNull();
  });
  it("saves from the form and preserves the entered title", () => {
    const onChange = vi.fn();
    render(<MorningWorshipMusic url="" history={[]} onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Worship song or playlist link" });
    fireEvent.change(input, { target: { value: firstUrl } });
    fireEvent.change(screen.getByRole("textbox", { name: "Worship music name" }), { target: { value: "Quiet morning" } });
    fireEvent.submit(input.closest("form")!);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ url: firstUrl, history: [expect.objectContaining({ title: "Quiet morning" })] }));
  });
  it("does not render unsafe saved URLs or load unsafe thumbnails", () => {
    const history = [{ ...savedMusic()[0], url: "javascript:alert(1)", thumbnail_url: "javascript:alert(1)" }];
    const { container } = render(<MorningWorshipMusic url="javascript:alert(1)" history={history} onChange={vi.fn()} />);
    expect(container.querySelector("a, img")).toBeNull();
  });
});
