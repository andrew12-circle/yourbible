import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PolishedTextarea } from "./PolishedTextarea";
import { JournalAiDocument, JournalAiPrivacy } from "@/components/journal/JournalAiPrivacy";
const h = vi.hoisted(() => ({ polish: vi.fn(), backup: vi.fn(), load: vi.fn(), allowed: vi.fn(), unavailable: vi.fn() }));
vi.mock("@/lib/ai/polishText", () => ({ polishText: h.polish }));
vi.mock("@/lib/journal/journalDraftStorage", () => ({ preserveJournalAiEdit: h.backup, loadJournalAiEdits: h.load }));
vi.mock("@/lib/journal/journalAiAccess", () => ({ canUseJournalCloudAi: h.allowed }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: "owner" } } }, error: null }) } } }));
vi.mock("@/lib/aiWritingAssistStore", () => {
  const state = { aiWritingAssistEnabled: true, polishUnavailable: false, markPolishUnavailable: h.unavailable };
  return { useAiWritingAssistStore: Object.assign((select: (v: typeof state) => unknown) => select(state), { getState: () => state }) };
});
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>((yes) => { resolve = yes; }); return { promise, resolve }; }
const original = "This is teh journal entry with all my own words.";
const polished = "This is the journal entry with all my own words.";
function Field({ allowed = true, identity = "entry-a", initial = original }: { allowed?: boolean; identity?: string; initial?: string }) {
  const [value, setValue] = useState(initial);
  return <JournalAiDocument.Provider value={identity}><JournalAiPrivacy.Provider value={allowed}>
    <PolishedTextarea aria-label="Entry" value={value} onChange={(e) => setValue(e.target.value)} polishResetKey={identity}
      enableWordPolish={false} enableIdlePolish={false} />
  </JournalAiPrivacy.Provider></JournalAiDocument.Provider>;
}
beforeEach(() => { h.polish.mockReset().mockResolvedValue(polished); h.backup.mockReset().mockResolvedValue({}); h.load.mockReset().mockResolvedValue([]); h.allowed.mockReset().mockResolvedValue(true); h.unavailable.mockClear(); });
afterEach(cleanup);
const blur = async () => { await act(async () => { fireEvent.blur(screen.getByLabelText("Entry")); }); };
describe("journal AI replacement safety", () => {
  it("keeps over-limit entries intact without sending anything", async () => {
    const long = original.repeat(400); render(<Field initial={long} />); await blur();
    expect(h.polish).not.toHaveBeenCalled(); expect(screen.getByLabelText("Entry")).toHaveValue(long);
  });
  it("blocks private fields before network or durable plaintext backup", async () => {
    render(<Field allowed={false} />); await blur(); expect(h.polish).not.toHaveBeenCalled(); expect(h.backup).not.toHaveBeenCalled();
  });
  it("enforces the authoritative metadata policy too", async () => {
    h.allowed.mockResolvedValue(false); render(<Field />); await blur(); expect(h.polish).not.toHaveBeenCalled();
  });
  it("requires a full original backup before applying any replacement", async () => {
    const disk = deferred<unknown>(); h.backup.mockReturnValue(disk.promise); render(<Field />); await blur();
    expect(h.backup).toHaveBeenCalledWith("owner", "entry-a", "body", original, polished);
    expect(screen.getByLabelText("Entry")).toHaveValue(original);
    await act(async () => { disk.resolve({}); }); expect(screen.getByLabelText("Entry")).toHaveValue(polished);
  });
  it("does not replace text if original preservation fails", async () => {
    h.backup.mockRejectedValue(new Error("disk full")); render(<Field />); await blur();
    expect(screen.getByLabelText("Entry")).toHaveValue(original); expect(screen.queryByText("Undo AI edit")).toBeNull();
  });
  it("rejects an old response after editing away and back to the same words", async () => {
    const response = deferred<string>(); h.polish.mockReturnValue(response.promise); render(<Field />); await blur();
    fireEvent.change(screen.getByLabelText("Entry"), { target: { value: original + " More" } });
    fireEvent.change(screen.getByLabelText("Entry"), { target: { value: original } });
    await act(async () => { response.resolve(polished); }); expect(screen.getByLabelText("Entry")).toHaveValue(original); expect(h.backup).not.toHaveBeenCalled();
  });
  it("discards a response after changing entry identity or privacy", async () => {
    const response = deferred<string>(); h.polish.mockReturnValue(response.promise); const view = render(<Field />); await blur();
    view.rerender(<Field identity="entry-b" allowed={false} />); await act(async () => { response.resolve(polished); });
    expect(screen.getByLabelText("Entry")).toHaveValue(original); expect(h.backup).not.toHaveBeenCalled();
  });
  it("undo restores the original correction without removing independent later typing", async () => {
    render(<Field />); await blur(); expect(screen.getByLabelText("Entry")).toHaveValue(polished);
    fireEvent.change(screen.getByLabelText("Entry"), { target: { value: polished + " My later paragraph." } });
    fireEvent.click(screen.getByRole("button", { name: "Undo AI edit" }));
    expect(screen.getByLabelText("Entry")).toHaveValue(original + " My later paragraph.");
  });
  it("loads a preserved original after reopening the editor", async () => {
    h.load.mockResolvedValue([{ before: original, after: polished }]); render(<Field initial={polished} />);
    await act(async () => {}); fireEvent.click(screen.getByRole("button", { name: "Undo AI edit" }));
    expect(screen.getByLabelText("Entry")).toHaveValue(original);
  });
});
