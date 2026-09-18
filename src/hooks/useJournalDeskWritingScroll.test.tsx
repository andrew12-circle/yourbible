import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJournalDeskWritingScroll } from "./useJournalDeskWritingScroll";

const h = vi.hoisted(() => ({ scroll: vi.fn() }));
vi.mock("@/lib/journal/scrollEditorCaretIntoView", () => ({ scrollEditorCaretIntoView: h.scroll }));
let frames: Map<number, FrameRequestCallback>;
let nextId: number;
function flushFrame() {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(0);
  });
}
function Editor({ external = "", entryId = "entry-a" }: { external?: string; entryId?: string }) {
  const pane = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  useJournalDeskWritingScroll({ scrollRef: pane, enabled: true, value: text + external, resetKey: entryId });
  return <div ref={pane} data-testid="pane">
    <input aria-label="Title" />
    <textarea aria-label="Body" value={text + external} onChange={(event) => setText(event.target.value)} />
  </div>;
}
beforeEach(() => {
  frames = new Map(); nextId = 0; h.scroll.mockClear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("desktop writing viewport", () => {
  it("waits until after the committed input layout before following the caret", () => {
    render(<Editor />);
    const body = screen.getByLabelText("Body");
    act(() => body.focus()); flushFrame(); h.scroll.mockClear();
    fireEvent.change(body, { target: { value: "A new line\nAnother line" } });
    expect(h.scroll).not.toHaveBeenCalled();
    flushFrame();
    expect(h.scroll).toHaveBeenCalledTimes(1);
    expect(h.scroll.mock.calls[0][0].textarea.value).toBe("A new line\nAnother line");
    expect(h.scroll.mock.calls[0][0].bottomInsetPx).toBe(0);
    expect(screen.getByTestId("pane").style.getPropertyValue("--journal-writing-room")).toBeTruthy();
  });
  it("does not yank the reader back after a wheel scroll; typing resumes following", () => {
    const { rerender } = render(<Editor />);
    const body = screen.getByLabelText("Body");
    act(() => body.focus()); flushFrame(); h.scroll.mockClear();
    fireEvent.wheel(body, { deltaY: -100 });
    rerender(<Editor external="An acknowledged update" />); flushFrame();
    expect(h.scroll).not.toHaveBeenCalled();
    fireEvent.input(body, { target: { value: "Writing again" } }); flushFrame();
    expect(h.scroll).toHaveBeenCalledTimes(1);
  });
  it("leaves title focus alone and follows keyboard caret navigation", () => {
    render(<Editor />);
    act(() => screen.getByLabelText("Title").focus()); flushFrame();
    expect(h.scroll).not.toHaveBeenCalled();
    const body = screen.getByLabelText("Body");
    act(() => body.focus()); flushFrame(); h.scroll.mockClear();
    fireEvent.keyUp(body, { key: "Home" });
    expect(h.scroll).not.toHaveBeenCalled(); flushFrame();
    expect(h.scroll).toHaveBeenCalledTimes(1);
  });
  it("cancels work when the editor closes without touching a different entry", () => {
    const { unmount } = render(<Editor />);
    act(() => screen.getByLabelText("Body").focus());
    expect(frames.size).toBe(1);
    unmount(); flushFrame();
    expect(h.scroll).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });
});
