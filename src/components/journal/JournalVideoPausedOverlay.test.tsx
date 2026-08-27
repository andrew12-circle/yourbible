import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JournalVideoPausedOverlay } from "./JournalVideoPausedOverlay";

afterEach(cleanup);

describe("JournalVideoPausedOverlay", () => {
  it("keeps both Resume and a 44px Save action reachable while paused", () => {
    const onResume = vi.fn();
    const onSavePartial = vi.fn();
    const { container } = render(
      <JournalVideoPausedOverlay
        reason="background"
        onResume={onResume}
        onSavePartial={onSavePartial}
        canResume
        backupState="saved"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    const save = screen.getByRole("button", { name: "Save this part" });
    fireEvent.click(save);
    expect(onResume).toHaveBeenCalledOnce();
    expect(onSavePartial).toHaveBeenCalledOnce();
    expect(save.className).toContain("h-11");
    expect(screen.getByText("Backed up on this device")).toBeInTheDocument();

    const root = container.firstElementChild as HTMLElement;
    const safeViewport = root.firstElementChild as HTMLElement;
    const card = safeViewport.firstElementChild as HTMLElement;
    expect(root).toHaveClass("overflow-y-auto", "overscroll-contain");
    expect(safeViewport).toHaveClass("min-h-full");
    expect(safeViewport.className).toContain("safe-area-inset-bottom");
    expect(card).toHaveClass("my-auto", "[@media(max-height:520px)]:gap-3");
  });

  it("offers Save as the primary recovery action when tracks cannot resume", () => {
    const onResume = vi.fn();
    const onSavePartial = vi.fn();
    render(
      <JournalVideoPausedOverlay
        reason="track-ended"
        onResume={onResume}
        onSavePartial={onSavePartial}
        canResume={false}
        backupState="at-risk"
        backupError="Backup is still finishing"
      />,
    );

    expect(screen.queryByRole("button", { name: "Resume" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save this part" }));
    expect(onSavePartial).toHaveBeenCalledOnce();
    expect(onResume).not.toHaveBeenCalled();
    expect(screen.getByText("Backup is still finishing")).toBeInTheDocument();
  });
});
