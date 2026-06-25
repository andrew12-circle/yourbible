import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MobileAppDock from "./MobileAppDock";

afterEach(() => cleanup());

describe("MobileAppDock", () => {
  it("minimal variant shows Study, Transcript, and Journal", () => {
    render(
      <MobileAppDock
        variant="minimal"
        onStudyClick={vi.fn()}
        onTranscriptClick={vi.fn()}
        onJournalClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Study" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transcript" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Journal" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
  });

  it("calls journal handler from minimal variant", () => {
    const onJournalClick = vi.fn();

    render(
      <MobileAppDock
        variant="minimal"
        onStudyClick={vi.fn()}
        onTranscriptClick={vi.fn()}
        onJournalClick={onJournalClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Journal" }));
    expect(onJournalClick).toHaveBeenCalledTimes(1);
  });
});
