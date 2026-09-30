import { useState, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MorningFoundationContext, type MorningFoundationContextValue } from "./MorningFoundationContext";
import { MorningFocusOpening, MorningHopePrayer, MorningRealMemories } from "./MorningFoundationPanels";
import { MorningMemoryEditor } from "./MorningFoundationEditors";
import { TodayAssignmentPanel } from "../TodayAssignmentPanel";
import { emptyDailyAssignment } from "@/lib/livingHope/morningRitual";
import { emptyWorkbook } from "@/lib/livingHope/workbookTypes";
import { emptyMorningFoundationSession, type MorningMemory } from "@/lib/livingHope/morningFoundation";
vi.mock("../MorningVoiceField", () => ({ MorningVoiceField: ({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) => <textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} /> }));
vi.mock("./MorningMemoryMedia", () => ({ MorningMemoryPreview: () => null, MorningMemoryMedia: () => <div>Private memory media controls</div> }));
const memory: MorningMemory = { id: "real-1", kind: "real_memory", title: "Real family dinner", body: "We listened to each other.", happenedOn: "Last spring", photoPath: "", audioPath: "", sceneId: "scene-1" };
const foundation = { ...emptyMorningFoundationSession(), initialized: true, theme: "Practice presence", motto: "Listen first", question: "What matters today?" };
const workbook = { ...emptyWorkbook(), morning_memories: [memory], stories: [{ id: "scene-1", title: "A future family evening", text: "An imagined evening." }] };
function Harness({ children, initialMemory = false, onSelect = vi.fn(), onEdit = vi.fn() }: { children: ReactNode; initialMemory?: boolean; onSelect?: (id: string) => void; onEdit?: (editing: boolean) => void }) {
  const [day, setDay] = useState({ ...foundation, memory: initialMemory ? { ...memory } : null, action: "Put my phone away at dinner" });
  const [book, setBook] = useState(workbook);
  return <MorningFoundationContext.Provider value={{ workbook: book, day, selectedSceneId: "scene-1", onDayChange: (patch) => setDay((previous) => ({ ...previous, ...patch })), onSaveSettings: async (settings) => { setBook((previous) => ({ ...previous, morning_foundation: settings })); }, onSaveMemories: async (memories) => { setBook((previous) => ({ ...previous, morning_memories: memories })); }, onSelectScene: onSelect, onEditingChange: onEdit }}>{children}</MorningFoundationContext.Provider>;
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("connected morning foundation", () => {
  it("shows a saved theme, motto and answer field within the opening", () => {
    render(<Harness><MorningFocusOpening /></Harness>);
    expect(screen.getByText("Practice presence")).toBeTruthy();
    expect(screen.getAllByText(/Listen first/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("My answer to today's question"), { target: { value: "My family" } });
    expect(screen.getByLabelText("My answer to today's question")).toHaveValue("My family");
  });
  it("locks the step only while the optional editor is open", () => {
    const onEdit = vi.fn();
    render(<Harness onEdit={onEdit}><MorningFocusOpening /></Harness>);
    fireEvent.click(screen.getByRole("button", { name: "Edit my foundation" }));
    expect(onEdit).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancel", exact: true }));
    expect(onEdit).toHaveBeenLastCalledWith(false);
  });
  it("does not save an imagined event without an explicit real-memory confirmation", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<MorningMemoryEditor memory={null} stories={[]} onSave={save} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Memory title"), { target: { value: "A conversation" } });
    fireEvent.change(screen.getByLabelText("What actually happened?"), { target: { value: "We sat together." } });
    expect(screen.getByRole("button", { name: "Save memory" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Save memory" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ kind: "real_memory", body: "We sat together." })));
  });
  it("keeps the editor and text when persistence fails", async () => {
    render(<MorningMemoryEditor memory={memory} stories={[]} onSave={vi.fn().mockRejectedValue(new Error("Offline"))} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("What actually happened?"), { target: { value: "My unsaved correction" } });
    fireEvent.click(screen.getByRole("button", { name: "Save memory" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
    expect(screen.getByLabelText("What actually happened?")).toHaveValue("My unsaved correction");
  });
  it("lets the user recall a real memory and deliberately select its paired future scene", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect}><MorningRealMemories /></Harness>);
    expect(screen.queryByRole("article", { name: "Today's real memory" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Recall this memory" }));
    expect(screen.getByRole("article", { name: "Today's real memory" })).toHaveTextContent("We listened to each other.");
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use this paired scene today" }));
    expect(onSelect).toHaveBeenCalledWith("scene-1");
  });
  it("removes a collection item only after confirmation and preserves today's snapshot", async () => {
    render(<Harness initialMemory><MorningRealMemories /></Harness>);
    fireEvent.click(screen.getByRole("button", { name: "Remove memory Real family dinner" }));
    expect(screen.getByRole("button", { name: "Confirm removal" })).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirm removal" })); });
    expect(screen.getByRole("article", { name: "Today's real memory" })).toHaveTextContent("Real family dinner");
    expect(screen.queryByRole("button", { name: "Edit memory Real family dinner" })).toBeNull();
  });
  it("appends the chosen action without replacing an existing assignment", async () => {
    function Assignment() {
      const [assignment, setAssignment] = useState({ ...emptyDailyAssignment(), mustDo: "Keep my existing priority" });
      return <TodayAssignmentPanel assignment={assignment} onChange={(patch) => setAssignment((previous) => ({ ...previous, ...patch }))} scriptureReflection="" visionRecall="" storyRecall="" thanksgivingNow={[]} touches={{}} goals={[]} />;
    }
    render(<Harness initialMemory><Assignment /></Harness>);
    fireEvent.click(screen.getByRole("button", { name: "Add without replacing my assignment" }));
    const field = screen.getByLabelText("The one thing — if only one thing gets done");
    expect(field).toHaveValue("Keep my existing priority\nPut my phone away at dinner");
    expect(screen.getByRole("button", { name: "Included in today's assignment" })).toBeDisabled();
  });
  it("labels the optional prayer and never writes suggested text into a saved testimony", () => {
    render(<Harness><MorningHopePrayer /></Harness>);
    expect(screen.getByText(/Suggested personal prayer/)).toHaveTextContent("not Scripture");
    expect(screen.queryByText("A claimed answered prayer")).toBeNull();
  });
  it("has no fabricated empty-state memories", () => {
    const value: MorningFoundationContextValue = { workbook: emptyWorkbook(), day: emptyMorningFoundationSession(), onDayChange: vi.fn(), onSaveSettings: vi.fn(), onSaveMemories: vi.fn(), onSelectScene: vi.fn(), selectedSceneId: "" };
    render(<MorningFoundationContext.Provider value={value}><MorningRealMemories /></MorningFoundationContext.Provider>);
    expect(screen.getByText(/Your memory collection is empty/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Recall this memory" })).toBeNull();
  });
});
