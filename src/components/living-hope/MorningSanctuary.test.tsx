import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MorningFormulaHub } from "./MorningFormulaHub";
import { LivingHopeChrome } from "./LivingHopeChrome";
import { MorningSessionHero } from "./MorningSessionHero";
import { MorningPrayerReader } from "./MorningPrayerReader";
import { ThanksgivingListsInput } from "./ThanksgivingListsInput";
import { MORNING_ATMOSPHERE, morningJourneyProgress } from "@/lib/livingHope/morningPresentation";
import { buildRitualSteps, type RitualStep } from "@/lib/livingHope/morningRitual";
import { emptyMorningRitualDraftFields, saveMorningRitualDraft } from "@/lib/livingHope/morningRitualDraft";
import { emptyWorkbook, WORKBOOK_SECTIONS } from "@/lib/livingHope/workbookTypes";
import { getWorkbookReadiness } from "@/lib/livingHope/workbookProgress";
import { localDateISO } from "@/lib/lifePriorities";
import { findMorningReviewJournalEntry } from "@/lib/livingHope/morningReviewJournal";

const identity = vi.hoisted(() => ({ userId: "sanctuary-test-owner", encrypted: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: identity.userId }, profile: { user_id: identity.userId, journal_e2e_enabled: identity.encrypted } }) }));
vi.mock("@/hooks/useAppShellMode", () => ({ useAppShellMode: () => ({ showHubShell: true }) }));
vi.mock("@/hooks/useKeyboardInset", () => ({ useVisualViewportMetrics: () => ({ viewportHeight: 844 }) }));
vi.mock("@/lib/livingHope/morningReviewJournal", () => ({ findMorningReviewJournalEntry: vi.fn() }));
vi.mock("./MorningThanksgivingVoice", () => ({ MorningThanksgivingVoice: ({ group }: { group: string }) => <div data-testid="active-gratitude-voice">{group}</div> }));
vi.mock("@/components/journal/DictateButton", () => ({ DictateButton: () => <button type="button" aria-label="Dictate" /> }));
vi.mock("./PrayerVoiceRecording", () => ({ PrayerVoiceRecording: ({ storagePath }: { storagePath?: string }) => <div data-testid="prayer-recording">{storagePath}</div> }));
vi.mock("@/components/living-hope/MorningVoiceField", () => ({ MorningVoiceField: ({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) => <textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} /> }));

beforeEach(() => { localStorage.clear(); identity.userId = "sanctuary-test-owner"; identity.encrypted = false; vi.mocked(findMorningReviewJournalEntry).mockReset().mockResolvedValue("saved-morning-entry"); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const workbook = { ...emptyWorkbook(), vision_headline: "Serve faithfully", manifesto: [{ id: "m1", text: "Choose faithfulness today." }], stories: [{ id: "s1", text: "A peaceful morning at home." }] };
function hub(overrides: Partial<ComponentProps<typeof MorningFormulaHub>> = {}) {
  return <MemoryRouter><MorningFormulaHub workbook={workbook} letter={null} goals={[]} todayReview={null} streak={0} greeting="Good morning" {...overrides} /></MemoryRouter>;
}

describe("Morning hub state and navigation", () => {
  it("keeps foundation readiness separate from a not-yet-started morning", () => {
    render(hub());
    const readiness = getWorkbookReadiness(workbook, [], null).percent;
    expect(readiness).toBeGreaterThan(0);
    expect(screen.getByText(`${readiness}% ready`)).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Today's session progress" }).getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByRole("link", { name: "Begin my morning" }).getAttribute("href")).toBe("/living-hope/review");
    expect(findMorningReviewJournalEntry).not.toHaveBeenCalled();
  });
  it("resumes the actual owner-scoped activity without hard-coding nine steps", () => {
    const steps = buildRitualSteps(workbook, [], false);
    const stepIndex = steps.findIndex((step) => step.kind === "scripture");
    saveMorningRitualDraft(identity.userId, { ...emptyMorningRitualDraftFields(), steps, stepIndex, expressMode: false, guidedMode: true });
    render(hub());
    expect(screen.getByRole("link", { name: /Resume at/ }).getAttribute("href")).toContain("/living-hope/review");
    const expected = morningJourneyProgress(steps, stepIndex, false);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(String(expected.percent));
    expect(screen.getByText(new RegExp(`Step ${expected.position} of ${expected.total}`))).toBeTruthy();
  });
  it("never resumes another person's draft", () => {
    const steps = buildRitualSteps(workbook, [], false);
    saveMorningRitualDraft("different-owner", { ...emptyMorningRitualDraftFields(), steps, stepIndex: 2, expressMode: false, guidedMode: true });
    render(hub());
    expect(screen.queryByRole("link", { name: /Resume at/ })).toBeNull();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });
  it("opens the existing completed journal, rather than starting another entry", async () => {
    const todayReview = { review_date: localDateISO() } as NonNullable<ComponentProps<typeof MorningFormulaHub>["todayReview"]>;
    render(hub({ todayReview }));
    const link = await screen.findByRole("link", { name: "Open today's journal" });
    expect(link.getAttribute("href")).toBe("/journal/saved-morning-entry");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
    expect(screen.queryByRole("link", { name: "Begin my morning" })).toBeNull();
  });
  it("keeps a failed journal lookup recoverable and does not offer a false begin link", async () => {
    vi.mocked(findMorningReviewJournalEntry).mockResolvedValue(null);
    const todayReview = { review_date: localDateISO() } as NonNullable<ComponentProps<typeof MorningFormulaHub>["todayReview"]>;
    render(hub({ todayReview }));
    const retry = await screen.findByRole("button", { name: "Try opening today's journal again" });
    expect(screen.getByRole("alert").textContent).toContain("No new entry has been created");
    fireEvent.click(retry);
    await waitFor(() => expect(findMorningReviewJournalEntry).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("link", { name: "Open today's journal" })).toBeNull();
  });
  it("does not label a prior day's review as completed today", () => {
    const todayReview = { review_date: "2000-01-01" } as NonNullable<ComponentProps<typeof MorningFormulaHub>["todayReview"]>;
    render(hub({ todayReview }));
    expect(screen.getByRole("link", { name: "Begin my morning" })).toBeTruthy();
    expect(findMorningReviewJournalEntry).not.toHaveBeenCalled();
  });
  it("preserves every real foundation destination behind the disclosure", () => {
    render(hub());
    fireEvent.click(screen.getByText("Explore all foundation sections"));
    const foundation = screen.getByRole("region", { name: "My foundation" });
    for (const section of WORKBOOK_SECTIONS) {
      const link = within(foundation).getByRole("link", { name: new RegExp(section.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
      expect(link.getAttribute("href")).toBe(`/living-hope/workbook/${section.key}`);
    }
  });
});

describe("Shared Morning Formula presentation", () => {
  it("has a defined atmosphere for every supported activity", () => {
    const kinds = ["intro", "worship", "thanksgiving", "scripture", "prayer", "manifesto", "vision", "story", "surrender", "covering", "assignment", "goal", "metrics", "done"] as const;
    for (const kind of kinds) expect(MORNING_ATMOSPHERE[kind].subtitle.length).toBeGreaterThan(10);
  });
  it("does not count the active step as finished", () => {
    const steps: RitualStep[] = [{ kind: "intro" }, { kind: "worship" }, { kind: "thanksgiving" }, { kind: "scripture" }, { kind: "done" }];
    expect(morningJourneyProgress(steps, 1, false)).toMatchObject({ position: 1, completed: 0, total: 3, percent: 0 });
    expect(morningJourneyProgress(steps, 2, false)).toMatchObject({ completed: 1, percent: 33 });
    expect(morningJourneyProgress(steps, 4, true).percent).toBe(100);
  });
  it("renders the same hero system on non-worship steps with real step totals", () => {
    const steps: RitualStep[] = [{ kind: "intro" }, { kind: "worship" }, { kind: "scripture" }, { kind: "done" }];
    render(<MemoryRouter><LivingHopeChrome session stepKey="scripture" hero={<MorningSessionHero title="Scripture" steps={steps} stepIndex={2} goalTotal={0} onStepIndexChange={vi.fn()} />}>Reading</LivingHopeChrome></MemoryRouter>);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText(MORNING_ATMOSPHERE.scripture.subtitle)).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuemax")).toBe("2");
  });
  it("gives workbook pages one heading and an active foundation section", () => {
    render(<MemoryRouter initialEntries={["/living-hope/workbook/quotes"]}><LivingHopeChrome title="Quotes" subtitle="Your anchors"><textarea aria-label="Saved quote" defaultValue="My saved words" /></LivingHopeChrome></MemoryRouter>);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const links = screen.getAllByRole("link", { name: "Quotes" });
    expect(links.every((link) => link.getAttribute("aria-current") === "page")).toBe(true);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("My saved words");
  });
  it("keeps reading and editing the original prayer and preserves the recording path", () => {
    const onChange = vi.fn();
    render(<MorningPrayerReader title="Surrender" value={"My own prayer.\nAmen."} onChange={onChange} prayerKey="surrender" recordingPath="owner/my-prayer.webm" onRecordingPathChange={vi.fn()} />);
    expect(screen.getByTestId("prayer-recording").textContent).toBe("owner/my-prayer.webm");
    fireEvent.click(screen.getByRole("button", { name: "Edit prayer" }));
    const field = screen.getByRole("textbox", { name: "Surrender prayer text" });
    expect((field as HTMLTextAreaElement).value).toBe("My own prayer.\nAmen.");
    fireEvent.change(field, { target: { value: "Updated personal prayer." } });
    expect(onChange).toHaveBeenCalledWith("Updated personal prayer.");
    expect(screen.getByText("Personal prayer, not Scripture.")).toBeTruthy();
  });
  it("mounts only one continuous gratitude microphone while preserving both lists", () => {
    const onNow = vi.fn(); const onAhead = vi.fn();
    render(<ThanksgivingListsInput thanksgivingNow={["My family", "", "", "", ""]} thanksgivingNotYet={["Wisdom", "", "", "", ""]} onThanksgivingNowChange={onNow} onThanksgivingNotYetChange={onAhead} />);
    expect(screen.getAllByTestId("active-gratitude-voice")).toHaveLength(1);
    fireEvent.change(screen.getByRole("textbox", { name: "Thankful today 2" }), { target: { value: "A quiet moment" } });
    expect(onNow).toHaveBeenCalledWith(1, "A quiet moment");
    fireEvent.click(screen.getByRole("button", { name: /Thankful for what's ahead/ }));
    expect(screen.getByTestId("active-gratitude-voice").textContent).toBe("not-yet");
    expect((screen.getByRole("textbox", { name: "Thankful for what's ahead 1" }) as HTMLInputElement).value).toBe("Wisdom");
    expect(onAhead).not.toHaveBeenCalled();
  });
});
