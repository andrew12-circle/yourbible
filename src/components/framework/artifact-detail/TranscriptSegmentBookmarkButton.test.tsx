import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TranscriptSegmentBookmarkButton from "./TranscriptSegmentBookmarkButton";

afterEach(() => {
  cleanup();
});

describe("TranscriptSegmentBookmarkButton", () => {
  it("shows filled red bookmark when marked", () => {
    render(
      <TranscriptSegmentBookmarkButton
        studyTranscript
        isActive
        isMarked
        stamp="55:53"
        startSeconds={3353}
        layout="inline"
        onClick={vi.fn()}
      />,
    );

    const icon = screen.getByRole("button", { name: /Bookmark at 55:53/i });
    expect(icon).toHaveAttribute("aria-pressed", "true");
    expect(icon.querySelector("svg")).toHaveClass("fill-red-500");
  });

  it("marks on click via handler", () => {
    const onClick = vi.fn();
    render(
      <TranscriptSegmentBookmarkButton
        studyTranscript
        isActive
        isMarked={false}
        stamp="1:00"
        startSeconds={60}
        layout="inline"
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Bookmark at 1:00/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
