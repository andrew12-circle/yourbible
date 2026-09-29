import { useState, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MorningFoundationContext } from "./MorningFoundationContext";
import { MorningWorshipPractice, WorshipMusicChoice } from "./MorningWorshipPractice";
import { MorningAngelsPrayer } from "./MorningAngelsPrayer";
import { emptyMorningFoundationSession, type MorningFoundationSession } from "@/lib/livingHope/morningFoundation";
import { emptyWorkbook } from "@/lib/livingHope/workbookTypes";
vi.mock("../MorningVoiceField", () => ({ MorningVoiceField: ({ label, value, onChange }: { label: string; value: string; onChange: (text: string) => void }) => <textarea aria-label={label} value={value} onChange={event => onChange(event.target.value)} /> }));
vi.mock("../PrayerVoiceRecording", () => ({ PrayerVoiceRecording: ({ prayerKey }: { prayerKey: string }) => <p data-testid="prayer-recording-slot">{prayerKey}</p> }));
function Harness({ children, available = 600_000 }: { children: ReactNode; available?: number }) {
  const [day, setDay] = useState<MorningFoundationSession>(emptyMorningFoundationSession);
  const [book, setBook] = useState(emptyWorkbook);
  return <MorningFoundationContext.Provider value={{ workbook: book, day, selectedSceneId: "", worshipRemainingMs: available, soundCuesEnabled: false,
    onDayChange: patch => setDay(previous => ({ ...previous, ...patch })), onSelectScene: vi.fn(), onSaveMemories: async () => {},
    onSaveSettings: async settings => { setBook(previous => ({ ...previous, morning_foundation: settings })); setDay(previous => ({ ...previous, ...settings })); } }}>{children}</MorningFoundationContext.Provider>;
}
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe("Worship and angels prayer controls", () => {
  it("offers singing, tongues or both without needing microphone access", async () => {
    render(<Harness><MorningWorshipPractice /><WorshipMusicChoice><p>Saved worship music</p></WorshipMusicChoice></Harness>);
    expect(screen.getByRole("timer")).toHaveTextContent("5:00");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Pray in tongues", exact: true })); });
    expect(screen.queryByText("Saved worship music")).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sing", exact: true })); });
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.getByText("Saved worship music")).toBeTruthy();
  });
  it("shows the exact shorter choice rather than pretending five minutes fits", () => {
    render(<Harness available={120_000}><MorningWorshipPractice /></Harness>);
    expect(screen.getByRole("button", { name: "Start prayer timer" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Use remaining worship time" }));
    expect(screen.getByRole("timer")).toHaveTextContent("2:00");
  });
  it("finishes the timer without checking off a prayer the user has not marked", () => {
    vi.useFakeTimers(); vi.setSystemTime(1_800_000_000_000);
    render(<Harness><MorningWorshipPractice /></Harness>);
    fireEvent.click(screen.getByRole("button", { name: "Start prayer timer" }));
    act(() => { vi.setSystemTime(1_800_000_300_000); vi.advanceTimersByTime(250); });
    expect(screen.getByRole("timer")).toHaveTextContent("0:00");
    expect(screen.getByRole("checkbox", { name: "I prayed in the Spirit today" })).not.toBeChecked();
  });
  it("saves a separate angels prayer and requires the user's daily spoken check-in", async () => {
    render(<Harness><MorningAngelsPrayer /></Harness>);
    expect(screen.getByTestId("prayer-recording-slot")).toHaveTextContent("angels");
    fireEvent.click(screen.getByRole("button", { name: "Write my prayer" }));
    fireEvent.change(screen.getByLabelText("My angels and protection prayer"), { target: { value: "Father, guard my family today." } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save this prayer" })); });
    expect(screen.getByText("Father, guard my family today.")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "I spoke this prayer aloud today" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "I spoke this prayer aloud today" }));
    expect(screen.getByRole("checkbox", { name: "I spoke this prayer aloud today" })).toBeChecked();
  });
});
