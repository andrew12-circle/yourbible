from pathlib import Path
root = Path(__file__).resolve().parents[1]

def replace_once(path, old, new):
    p = root / path
    text = p.read_text()
    if text.count(old) != 1:
        raise SystemExit(f'Unexpected source at {path}')
    p.write_text(text.replace(old, new))

replace_once('src/components/living-hope/MorningRitualStepPanels.tsx', 'import { MORNING_FORMULA_WORSHIP_RETURN }', 'import { morningFormulaReaderState, MORNING_FORMULA_WORSHIP_RETURN }')
replace_once('src/pages/reader/ReaderPage.tsx', 'import { readReaderWindowFlow,', 'import { Button } from "@/components/ui/button";\nimport { readReaderWindowFlow,')
replace_once('src/lib/livingHope/morningConversationJournal.ts', 'import { getCurrentContext }', 'import { scheduleEntryContextEnrichment }')
replace_once('src/lib/livingHope/morningConversationJournal.ts', '    const context = await getCurrentContext().catch(() => ({}));\n', '')
replace_once('src/lib/livingHope/morningConversationJournal.ts', '      p_context: JSON.parse(JSON.stringify(context)),', '      p_context: {},')
replace_once('src/lib/livingHope/morningConversationJournal.ts', '    return { entryId: data[0].entry_id, created: data[0].created };', '    if (data[0].created) scheduleEntryContextEnrichment(userId, data[0].entry_id);\n    return { entryId: data[0].entry_id, created: data[0].created };')
replace_once('src/lib/livingHope/morningConversationJournal.ts', '.order("updated_at", { ascending: false })', '.order("created_at", { ascending: true })')

(root / 'src/components/living-hope/MorningThanksgivingVoice.tsx').write_text(r'''import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { JournalAiPrivacy } from "@/components/journal/JournalAiPrivacy";
import { useAuth } from "@/contexts/AuthContext";
import { localDateISO } from "@/lib/lifePriorities";
import { placeSpokenThanksgiving } from "@/lib/livingHope/spokenThanksgiving";

export function MorningThanksgivingVoice({ group, values, onChange }: { group: "now" | "not-yet"; values: string[]; onChange: (index: number, value: string) => void }) {
  const { user, profile } = useAuth();
  const key = `yb-morning-thanks:${user?.id ?? "signed-out"}:${localDateISO()}:${group}`;
  const allowed = Boolean(user && profile && profile.user_id === user.id) && !profile?.journal_e2e_enabled;
  const [draft, setDraft] = useState<{ key: string; text: string }>({ key: "", text: "" });
  const transcript = draft.key === key ? draft.text : "";
  const draftRef = useRef({ key: "", text: "" });
  const setTranscript = (value: string | ((previous: string) => string)) => {
    const previous = draftRef.current.key === key ? draftRef.current.text : "";
    const text = typeof value === "function" ? value(previous) : value;
    draftRef.current = { key, text };
    // Persist outside React's state updater so a final speech result survives navigation.
    try { if (allowed) { if (text) sessionStorage.setItem(key, text); else sessionStorage.removeItem(key); } } catch { /* Keep the visible draft. */ }
    setDraft({ key, text });
  };
  const [interim, setInterim] = useState("");
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  const mic = useRef<DictateButtonHandle>(null);
  useEffect(() => {
    let text = "";
    try { if (allowed) text = sessionStorage.getItem(key) ?? ""; else sessionStorage.removeItem(key); } catch { /* Optional device cache. */ }
    draftRef.current = { key, text };
    setDraft({ key, text });
    setInterim(""); setMessage("");
    const control = mic.current;
    return () => control?.stop();
  }, [key, allowed]);
  const preview = placeSpokenThanksgiving(values, transcript);
  return <JournalAiPrivacy.Provider value={allowed}>
    <div className="rounded-xl bg-muted/30 p-3 mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <DictateButton ref={mic} userId={user?.id} webSpeechOnly onAppend={(chunk) => setTranscript((v) => `${v}${v && !/\s$/.test(v) ? " " : ""}${chunk}`)} onInterim={(partial) => {
          setInterim(partial);
          if (!allowed) return;
          const finalText = draftRef.current.key === key ? draftRef.current.text : "";
          const recovery = `${finalText}${finalText && partial ? " " : ""}${partial}`;
          try { if (recovery) sessionStorage.setItem(key, recovery); else sessionStorage.removeItem(key); } catch { /* Keep the live transcript. */ }
        }} onListeningChange={setActive} />
        <Button type="button" variant="outline" className="min-w-0 flex-1 h-auto min-h-9 whitespace-normal py-2" disabled={!allowed} onClick={() => mic.current?.toggle()}>{active ? "Stop speaking" : group === "now" ? "Speak my thanks for today" : "Speak my thanks for what's ahead"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Say your five thanks aloud. Say “next item” between them, then stop and place them into the list. Your existing answers will not be overwritten.</p>
      {!allowed && <p className="text-xs text-muted-foreground">Browser dictation is disabled when private-journal encryption is enabled. You can still type below.</p>}
      {(active || transcript) && <>
        <Textarea aria-label={`Spoken thanksgiving ${group}`} value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={3} placeholder="Your spoken words appear here…" />
        {interim && <p className="text-sm text-muted-foreground" aria-live="polite">{interim}</p>}
        <Button type="button" size="sm" disabled={active || !preview.placed} onClick={() => {
          const next = placeSpokenThanksgiving(values, transcript);
          next.values.forEach((value, index) => { if (value !== (values[index] ?? "")) onChange(index, value); });
          setTranscript(next.remaining);
          setMessage(`${next.placed} thanks added.${next.remaining ? " Extra words are kept above; nothing was discarded." : " You can edit each line below."}`);
        }}>Place into this list</Button>
        {!active && transcript && !preview.placed && <p className="text-xs">All five lines are filled. Your words are kept here; edit or clear a line before adding more.</p>}
      </>}
      {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
    </div>
  </JournalAiPrivacy.Provider>;
}
''')

(root / 'src/components/living-hope/MorningThanksgivingVoice.test.tsx').write_text(r'''import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({
  encrypted: false,
  append: (_chunk: string) => undefined as void,
  interim: (_chunk: string) => undefined as void,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "voice-user" }, profile: { user_id: "voice-user", journal_e2e_enabled: state.encrypted } }) }));
vi.mock("@/lib/lifePriorities", () => ({ localDateISO: () => "2026-01-01" }));
vi.mock("@/components/journal/DictateButton", async () => {
  const { forwardRef, useImperativeHandle } = await import("react");
  return {
  DictateButton: forwardRef(function MockDictate(props: { onAppend: (chunk: string) => void; onInterim: (chunk: string) => void; onListeningChange: (value: boolean) => void }, ref) {
    state.append = props.onAppend;
    state.interim = props.onInterim;
    useImperativeHandle(ref, () => ({ stop: () => props.onListeningChange(false), toggle: () => props.onListeningChange(true) }));
    return <span>Microphone</span>;
  }),
  };
});
import { MorningThanksgivingVoice } from "./MorningThanksgivingVoice";
const key = (group = "now") => `yb-morning-thanks:voice-user:2026-01-01:${group}`;
beforeEach(() => { state.encrypted = false; sessionStorage.clear(); });
afterEach(cleanup);

describe("spoken thanksgiving capture", () => {
  it("places recognized speech into empty lines and keeps existing answers", () => {
    const onChange = vi.fn();
    render(<MorningThanksgivingVoice group="now" values={["Already written", "", "", "", ""]} onChange={onChange} />);
    act(() => state.append("Family next item Today's peace"));
    fireEvent.click(screen.getByRole("button", { name: "Place into this list" }));
    expect(onChange.mock.calls).toEqual([[1, "Family"], [2, "Today's peace"]]);
    expect(sessionStorage.getItem(key())).toBeNull();
  });
  it("restores unplaced speech after leaving and returning", () => {
    const view = render(<MorningThanksgivingVoice group="now" values={[]} onChange={vi.fn()} />);
    act(() => state.append("Do not lose these words"));
    view.unmount();
    render(<MorningThanksgivingVoice group="now" values={[]} onChange={vi.fn()} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Do not lose these words");
  });
  it("stores final recognition results even if they arrive during unmount", () => {
    const view = render(<MorningThanksgivingVoice group="now" values={[]} onChange={vi.fn()} />);
    const append = state.append;
    act(() => append("First words"));
    view.unmount();
    act(() => append("last words"));
    expect(sessionStorage.getItem(key())).toBe("First words last words");
  });
  it("keeps an interim recovery copy without duplicating finalized speech", () => {
    render(<MorningThanksgivingVoice group="now" values={[]} onChange={vi.fn()} />);
    act(() => state.interim("My family"));
    expect(sessionStorage.getItem(key())).toBe("My family");
    act(() => { state.append("My family"); state.interim(""); });
    expect(sessionStorage.getItem(key())).toBe("My family");
  });
  it("isolates thanks for now from thanks for what has not yet come", () => {
    sessionStorage.setItem(key(), "Only for now");
    const view = render(<MorningThanksgivingVoice group="now" values={[]} onChange={vi.fn()} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Only for now");
    view.rerender(<MorningThanksgivingVoice group="not-yet" values={[]} onChange={vi.fn()} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(sessionStorage.getItem(key())).toBe("Only for now");
  });
  it("retains overflow after filling the fifth line", () => {
    render(<MorningThanksgivingVoice group="now" values={["1", "2", "3", "4", ""]} onChange={vi.fn()} />);
    act(() => state.append("Fifth next item Keep extra"));
    fireEvent.click(screen.getByRole("button", { name: "Place into this list" }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Keep extra");
  });
  it("does not restore plaintext speech when private-journal encryption is enabled", () => {
    state.encrypted = true;
    sessionStorage.setItem(key(), "Previously visible draft");
    render(<MorningThanksgivingVoice group="now" values={[]} onChange={vi.fn()} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Speak my thanks for today" }).hasAttribute("disabled")).toBe(true);
    expect(sessionStorage.getItem(key())).toBeNull();
  });
});
''')
(root / 'src/lib/livingHope/morningConversationPersistence.test.ts').write_text(r'''import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), lookup: vi.fn(), journal: vi.fn(), enrich: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: fake.from, rpc: fake.rpc } }));
vi.mock("@/lib/journal/journals", () => ({ getDefaultJournalId: fake.journal }));
vi.mock("@/lib/journal/context", () => ({ scheduleEntryContextEnrichment: fake.enrich }));
import { getOrCreateMorningConversationEntry } from "./morningConversationJournal";

beforeEach(() => {
  vi.clearAllMocks();
  fake.from.mockImplementation(() => {
    const query = { select: () => query, eq: () => query, contains: () => query, order: () => query, limit: () => query, maybeSingle: fake.lookup };
    return query;
  });
  fake.lookup.mockResolvedValue({ data: null, error: null });
  fake.journal.mockResolvedValue("default-journal");
  fake.rpc.mockResolvedValue({ data: [{ entry_id: "one-entry", created: true }], error: null });
});

describe("single daily Morning Formula journal", () => {
  it("reuses the existing video entry instead of creating another journal", async () => {
    fake.lookup.mockResolvedValue({ data: { id: "video-entry" }, error: null });
    await expect(getOrCreateMorningConversationEntry("user", "2026-01-01")).resolves.toEqual({ entryId: "video-entry", created: false });
    expect(fake.rpc).not.toHaveBeenCalled();
  });
  it("coalesces simultaneous worship and thanksgiving entry requests", async () => {
    const result = await Promise.all([getOrCreateMorningConversationEntry("user", "2026-01-01"), getOrCreateMorningConversationEntry("user", "2026-01-01")]);
    expect(result.map((row) => row.entryId)).toEqual(["one-entry", "one-entry"]);
    expect(fake.lookup).toHaveBeenCalledTimes(1);
    expect(fake.rpc).toHaveBeenCalledTimes(1);
    expect(fake.rpc.mock.calls[0][0]).toBe("ensure_morning_formula_entry");
    expect(fake.enrich).toHaveBeenCalledWith("user", "one-entry");
  });
  it("does not create a duplicate when the lookup fails", async () => {
    fake.lookup.mockResolvedValue({ data: null, error: new Error("offline") });
    await expect(getOrCreateMorningConversationEntry("user", "2026-01-01")).rejects.toThrow("offline");
    expect(fake.rpc).not.toHaveBeenCalled();
  });
  it("clears a failed in-flight request so a retry can succeed", async () => {
    fake.rpc.mockResolvedValueOnce({ data: null, error: new Error("unavailable") });
    await expect(getOrCreateMorningConversationEntry("user", "2026-01-01")).rejects.toThrow("unavailable");
    await expect(getOrCreateMorningConversationEntry("user", "2026-01-01")).resolves.toMatchObject({ entryId: "one-entry" });
  });
  it("keeps different users and dates isolated", async () => {
    await Promise.all([getOrCreateMorningConversationEntry("user-a", "2026-01-01"), getOrCreateMorningConversationEntry("user-b", "2026-01-01"), getOrCreateMorningConversationEntry("user-a", "2026-01-02")]);
    expect(fake.rpc).toHaveBeenCalledTimes(3);
  });
});
''')
print('Applied reader import fixes, nonblocking context enrichment, speech recovery and twelve regression tests.')
