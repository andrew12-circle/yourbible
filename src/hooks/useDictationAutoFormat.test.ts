import { describe, expect, it, vi } from "vitest";
import { useDictationAutoFormat } from "@/hooks/useDictationAutoFormat";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/ai/formatDictatedTextLocally", () => ({
  formatDictationForJournal: vi.fn((text: string) => `Formatted: ${text}`),
}));

describe("useDictationAutoFormat", () => {
  it("formats body when dictation stops", () => {
    const setBody = vi.fn();
    const { result } = renderHook(() =>
      useDictationAutoFormat({
        getBody: () => "raw speech without punctuation",
        setBody,
        minChars: 10,
      }),
    );

    act(() => {
      result.current.onListeningChange(true);
      result.current.onListeningChange(false);
    });

    expect(setBody).toHaveBeenCalledWith("Formatted: raw speech without punctuation");
  });

  it("skips when disabled", () => {
    const setBody = vi.fn();
    const { result } = renderHook(() =>
      useDictationAutoFormat({
        getBody: () => "some dictated text here",
        setBody,
        enabled: false,
      }),
    );

    act(() => {
      result.current.onListeningChange(true);
      result.current.onListeningChange(false);
    });

    expect(setBody).not.toHaveBeenCalled();
  });
});
