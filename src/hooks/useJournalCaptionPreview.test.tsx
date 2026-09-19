import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useJournalCaptionPreview } from "./useJournalCaptionPreview";
afterEach(cleanup);
const initial = { owner: "user:entry", body: "Original words", enabled: true };
const setup = () => renderHook(({ owner, body, enabled }) => useJournalCaptionPreview(owner, body, enabled), { initialProps: initial });

describe("scoped journal recording preview", () => {
  it("updates the in-body preview without altering the canonical entry", () => {
    const { result } = setup();
    act(() => result.current.start(initial.body, 8));
    act(() => result.current.update("new"));
    const id = result.current.preview?.id;
    act(() => result.current.update("new spoken words"));
    expect(result.current.preview).toEqual({ id, anchor: 8, text: "new spoken words" });
    expect(initial.body).toBe("Original words");
  });
  it("cancel removes the preview and rejects late captions", () => {
    const { result } = setup();
    act(() => result.current.start(initial.body, 0));
    act(() => result.current.update("First take"));
    const delayed = result.current.update;
    act(() => result.current.clear());
    act(() => delayed("Late speech"));
    expect(result.current.preview).toBeNull();
  });
  it("retake replaces rather than appends the previous take", () => {
    const { result } = setup();
    act(() => result.current.start(initial.body, 0));
    act(() => result.current.update("First take"));
    const firstId = result.current.preview?.id;
    act(() => result.current.start(initial.body, 0));
    expect(result.current.preview?.text).toBe("");
    act(() => result.current.update("Second take"));
    expect(result.current.preview?.id).not.toBe(firstId);
    expect(result.current.preview?.text).toBe("Second take");
  });
  it("hides captions immediately when switching entry/account and ignores the previous recorder", () => {
    const { result, rerender } = setup();
    act(() => result.current.start(initial.body, 0));
    act(() => result.current.update("Private first entry"));
    const delayed = result.current.update;
    const cancelOld = result.current.clear;
    rerender({ ...initial, owner: "other-user:other-entry", body: "Other entry" });
    expect(result.current.preview).toBeNull();
    act(() => result.current.start("Other entry", 0));
    act(() => result.current.update("Second entry speech"));
    act(() => { delayed("Do not leak this"); cancelOld(); });
    expect(result.current.preview?.text).toBe("Second entry speech");
  });
  it("removes preview when privacy permission changes and does not restore it on unlock", () => {
    const { result, rerender } = setup();
    act(() => result.current.start(initial.body, 0));
    act(() => result.current.update("Speech"));
    rerender({ ...initial, enabled: false });
    expect(result.current.preview).toBeNull();
    rerender(initial);
    expect(result.current.preview).toBeNull();
  });
  it("does not duplicate the completed transcript during a document refresh", () => {
    const { result, rerender } = setup();
    act(() => result.current.start(initial.body, initial.body.length));
    act(() => result.current.update("Spoken words"));
    rerender({ ...initial, body: initial.body + "\n\nSpoken words." });
    expect(result.current.preview?.text).toBe("");
  });
});
