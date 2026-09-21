import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
