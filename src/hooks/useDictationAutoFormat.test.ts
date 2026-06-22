import { describe, expect, it } from "vitest";
import { useDictationAutoFormat } from "@/hooks/useDictationAutoFormat";
import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/lib/ai/formatDictatedText", () => ({
  formatDictatedTextWithFallback: vi.fn(async (text: string) => ({
    text: `Formatted: ${text}`,
    usedFallback: false,
  })),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("useDictationAutoFormat", () => {
  it("formats body when dictation stops", async () => {
    const setBody = vi.fn();
    const { result } = renderHook(() =>
      useDictationAutoFormat({
        getBody: () => "raw speech without punctuation",
        setBody,
        minChars: 10,
      }),
    );

    await act(async () => {
      result.current.onListeningChange(true);
      result.current.onListeningChange(false);
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(setBody).toHaveBeenCalledWith("Formatted: raw speech without punctuation");
  });

  it("skips when disabled", async () => {
    const setBody = vi.fn();
    const { result } = renderHook(() =>
      useDictationAutoFormat({
        getBody: () => "some dictated text here",
        setBody,
        enabled: false,
      }),
    );

    await act(async () => {
      result.current.onListeningChange(true);
      result.current.onListeningChange(false);
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(setBody).not.toHaveBeenCalled();
  });
});
