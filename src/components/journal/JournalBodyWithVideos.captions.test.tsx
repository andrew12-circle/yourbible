import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import JournalBodyWithVideos from "./JournalBodyWithVideos";
import { useJournalPrivacyBlurStore } from "@/lib/journal/journalPrivacyBlurStore";
import type { JournalVideoRow } from "@/lib/journal/videos";

vi.mock("@/components/writing/PolishedTextarea", () => ({
  PolishedTextarea: forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & {
    polishResetKey?: string; polishFieldKey?: string; allowAiPolish?: boolean;
  }>(function Field({ polishResetKey: _key, polishFieldKey: _field, allowAiPolish, ...props }, ref) {
    return <textarea {...props} ref={ref} data-ai-enabled={allowAiPolish} />;
  }),
}));
vi.mock("./JournalEntryVideos", () => ({ default: ({ videos }: { videos: JournalVideoRow[] }) =>
  <video data-testid="recording" src={videos[0].url} /> }));
afterEach(() => { cleanup(); useJournalPrivacyBlurStore.setState({ journalPrivacyBlurEnabled: false }); });
const caption = { id: "capture", text: "Words as I talk", anchor: 6 };
const video = { id: "saved-video", anchor_offset: 0, created_at: "2026-01-01", url: "stable-video" } as unknown as JournalVideoRow;

describe("captions inside the journal body", () => {
  it("renders spoken prose at the recording position, not inside an editable/saved text value", () => {
    render(<JournalBodyWithVideos body="BeforeAfter" videos={[]} captionPreview={caption} onBodyChange={vi.fn()} />);
    const live = screen.getByRole("region", { name: "Live recording text" });
    expect(live.textContent).toBe(caption.text);
    const fields = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
    expect(fields.map(f => f.value)).toEqual(["Before", "After"]);
    expect(fields[0].compareDocumentPosition(live) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(live.compareDocumentPosition(fields[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fields.every(f => f.dataset.aiEnabled === "false")).toBe(true);
  });
  it("keeps video and surrounding input nodes stable across every interim update", () => {
    const props = { body: "BeforeAfter", videos: [video], onBodyChange: vi.fn() };
    const { rerender } = render(<JournalBodyWithVideos {...props} captionPreview={caption} />);
    const media = screen.getByTestId("recording");
    const live = screen.getByRole("region", { name: "Live recording text" });
    const fields = screen.getAllByRole("textbox");
    for (const text of ["Words", "Words as", "Words as I talk more"]) {
      rerender(<JournalBodyWithVideos {...props} captionPreview={{ ...caption, text }} />);
      expect(screen.getByTestId("recording")).toBe(media);
      expect(media.getAttribute("src")).toBe("stable-video");
      expect(screen.getByRole("region", { name: "Live recording text" })).toBe(live);
      expect(screen.getAllByRole("textbox")).toEqual(fields);
    }
  });
  it("preserves manual edits next to the recording without persisting transient speech", () => {
    const change = vi.fn();
    render(<JournalBodyWithVideos body="BeforeAfter" videos={[]} captionPreview={caption} onBodyChange={change} />);
    fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: "My edited ending" } });
    expect(change.mock.calls[0][0]).toBe("BeforeMy edited ending");
    expect(change.mock.calls[0][0]).not.toContain(caption.text);
  });
  it("applies the existing privacy blur to live speech", () => {
    useJournalPrivacyBlurStore.setState({ journalPrivacyBlurEnabled: true });
    render(<JournalBodyWithVideos body="" videos={[]} captionPreview={{ ...caption, anchor: 0 }} onBodyChange={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Live recording text" })).toHaveClass("blur-md");
  });
});
