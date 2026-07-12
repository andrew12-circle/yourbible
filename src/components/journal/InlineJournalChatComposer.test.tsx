import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import InlineJournalChatComposer from "@/components/journal/InlineJournalChatComposer";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("InlineJournalChatComposer", () => {
  it("shows the normal-entry conversion action in chat options", () => {
    const onSaveAsEntry = vi.fn();

    render(
      <InlineJournalChatComposer
        value="Hello"
        onChange={vi.fn()}
        onSend={vi.fn()}
        onExit={vi.fn()}
        onSaveAsEntry={onSaveAsEntry}
        saveAsEntryLabel="Make normal entry"
        onRetryLast={vi.fn()}
        canRetryLast
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Add and chat options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Make normal entry" }));

    expect(onSaveAsEntry).toHaveBeenCalledTimes(1);
  });
});
