import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMyAiSendQueue } from "./useMyAiSendQueue";

describe("useMyAiSendQueue", () => {
  it("enqueues and dequeues turns in order", () => {
    const { result } = renderHook(() => useMyAiSendQueue());

    act(() => {
      expect(result.current.enqueue("first")).toBe(true);
      expect(result.current.enqueue("second", "web")).toBe(true);
    });

    expect(result.current.queuedCount).toBe(2);
    expect(result.current.peek()).toEqual({ text: "first", scope: undefined });

    let next: ReturnType<typeof result.current.dequeue> = null;
    act(() => {
      next = result.current.dequeue();
    });
    expect(next).toEqual({ text: "first", scope: undefined });
    expect(result.current.queuedCount).toBe(1);

    act(() => {
      next = result.current.dequeue();
    });
    expect(next).toEqual({ text: "second", scope: "web" });
    expect(result.current.queuedCount).toBe(0);
  });

  it("ignores empty text and clears the queue", () => {
    const { result } = renderHook(() => useMyAiSendQueue());

    act(() => {
      expect(result.current.enqueue("   ")).toBe(false);
      result.current.enqueue("keep");
      result.current.clearQueue();
    });

    expect(result.current.queuedCount).toBe(0);
    expect(result.current.peek()).toBeNull();
  });
});
