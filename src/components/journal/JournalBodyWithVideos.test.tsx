import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import JournalBodyWithVideos from "./JournalBodyWithVideos";
import type { JournalVideoRow } from "@/lib/journal/videos";

vi.mock("@/components/journal/JournalEntryVideos", () => ({
  default: () => <div data-testid="journal-video" />,
}));

const video: JournalVideoRow = {
  id: "video-1",
  entry_id: "entry-1",
  storage_path: "entry-1/video-1.webm",
  duration_ms: 30_000,
  mime_type: "video/webm",
  transcript: "Recorded reflection",
  anchor_offset: 0,
  created_at: "2026-08-27T14:42:00.000Z",
};

afterEach(cleanup);

describe("JournalBodyWithVideos", () => {
  it("keeps focus and the same textarea while typing after a video transcript", () => {
    const onBodyChange = vi.fn();
    const onBodyFocus = vi.fn();
    const onBodyBlur = vi.fn();

    function Harness() {
      const [body, setBody] = useState("Recorded reflection");
      return (
        <JournalBodyWithVideos
          body={body}
          videos={[video]}
          onBodyChange={(next, cursor) => {
            onBodyChange(next, cursor);
            setBody(next);
          }}
          onBodyFocus={onBodyFocus}
          onBodyBlur={onBodyBlur}
        />
      );
    }

    render(<Harness />);

    const textarea = screen.getByPlaceholderText(
      "What happened today? Type #tag or @journal name to organize.",
    ) as HTMLTextAreaElement;
    textarea.focus();
    expect(document.activeElement).toBe(textarea);
    fireEvent.change(textarea, {
      target: { value: "Recorded reflection. So", selectionStart: 23 },
    });

    expect(screen.getByPlaceholderText(/What happened today/)).toBe(textarea);
    expect(document.activeElement).toBe(textarea);
    expect(onBodyChange).toHaveBeenLastCalledWith("Recorded reflection. So", 23);

    fireEvent.change(textarea, {
      target: { value: "Recorded reflection. So today", selectionStart: 29 },
    });

    expect(screen.getByPlaceholderText(/What happened today/)).toBe(textarea);
    expect(document.activeElement).toBe(textarea);
    expect(onBodyChange).toHaveBeenLastCalledWith("Recorded reflection. So today", 29);
    expect(onBodyFocus).toHaveBeenCalledOnce();
    expect(onBodyBlur).not.toHaveBeenCalled();
  });

  it("stays in writing mode when focus moves across a video", () => {
    const onBodyFocus = vi.fn();
    const onBodyBlur = vi.fn();
    const inlineVideo = { ...video, anchor_offset: 7 };

    render(
      <JournalBodyWithVideos
        body="Before. After."
        videos={[inlineVideo]}
        onBodyChange={() => {}}
        onBodyFocus={onBodyFocus}
        onBodyBlur={onBodyBlur}
      />,
    );

    const [beforeVideo, afterVideo] = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
    beforeVideo.focus();
    afterVideo.focus();

    expect(document.activeElement).toBe(afterVideo);
    expect(onBodyFocus).toHaveBeenCalledTimes(2);
    expect(onBodyBlur).not.toHaveBeenCalled();
  });
});
