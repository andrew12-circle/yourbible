import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewJournalEntryPhotoSuggestion } from "./NewJournalEntryPhotoSuggestion";

afterEach(cleanup);

function callbacks() {
  return {
    onAddPhotos: vi.fn(),
    onTakePhoto: vi.fn(),
    onDismiss: vi.fn(),
  };
}

function EditorHarness({
  onDismiss,
  onBlur,
}: {
  onDismiss: () => void;
  onBlur: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [body, setBody] = useState("My journal text stays here.");
  return (
    <>
      <textarea
        aria-label="Journal entry"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onBlur={onBlur}
      />
      {!dismissed && (
        <NewJournalEntryPhotoSuggestion
          onAddPhotos={() => {}}
          onTakePhoto={() => {}}
          onDismiss={() => {
            setDismissed(true);
            onDismiss();
          }}
        />
      )}
    </>
  );
}

describe("NewJournalEntryPhotoSuggestion", () => {
  it.each(["Dismiss photo suggestion", "Not now"])(
    "%s dismisses without touching the journal text and stays hidden while writing",
    (name) => {
      const onDismiss = vi.fn();
      const onBlur = vi.fn();
      render(<EditorHarness onDismiss={onDismiss} onBlur={onBlur} />);
      const editor = screen.getByRole("textbox", { name: "Journal entry" });
      const button = screen.getByRole("button", { name });
      editor.focus();

      // Model the browser's focus-changing default action before click.
      // A bare onClick handler lets blur/reflow move the target first.
      const press = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      fireEvent(button, press);
      if (!press.defaultPrevented) button.focus();
      expect(press.defaultPrevented).toBe(true);
      expect(editor).toHaveFocus();
      expect(onBlur).not.toHaveBeenCalled();
      expect(onDismiss).not.toHaveBeenCalled();

      fireEvent.click(button);
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("region", { name: "Photo suggestion" })).not.toBeInTheDocument();
      expect(editor).toHaveValue("My journal text stays here.");
      fireEvent.change(editor, { target: { value: "I can keep journaling." } });
      expect(editor).toHaveValue("I can keep journaling.");
      expect(screen.queryByRole("region", { name: "Photo suggestion" })).not.toBeInTheDocument();
    },
  );

  it.each(["touch", "pen", "mouse"])(
    "prevents focus-changing %s presses but waits for click to dismiss",
    (pointerType) => {
      const props = callbacks();
      render(<NewJournalEntryPhotoSuggestion {...props} />);
      for (const name of ["Dismiss photo suggestion", "Not now"]) {
        const button = screen.getByRole("button", { name });
        // MouseEvent supplies the shared button fields even in a test DOM
        // without a PointerEvent constructor.
        const press = new MouseEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          button: 0,
        });
        Object.defineProperty(press, "pointerType", { value: pointerType });
        fireEvent(button, press);
        expect(press.defaultPrevented).toBe(true);
        expect(props.onDismiss).not.toHaveBeenCalled();
        fireEvent.pointerCancel(button);
        expect(props.onDismiss).not.toHaveBeenCalled();
      }
      expect(screen.getByRole("region", { name: "Photo suggestion" })).toBeInTheDocument();
    },
  );

  it("does not cancel a secondary-button press", () => {
    const props = callbacks();
    render(<NewJournalEntryPhotoSuggestion {...props} />);
    const press = new MouseEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      button: 2,
    });
    fireEvent(screen.getByRole("button", { name: "Dismiss photo suggestion" }), press);
    expect(press.defaultPrevented).toBe(false);
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it.each(["Dismiss photo suggestion", "Not now"])(
    "%s accepts a non-pointer click without submitting a form or opening photos",
    (name) => {
      const props = callbacks();
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <NewJournalEntryPhotoSuggestion {...props} />
        </form>,
      );
      fireEvent.click(screen.getByRole("button", { name }), { detail: 0 });
      expect(props.onDismiss).toHaveBeenCalledTimes(1);
      expect(props.onAddPhotos).not.toHaveBeenCalled();
      expect(props.onTakePhoto).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
    },
  );

  it("keeps both photo actions working independently of dismissal", () => {
    const props = callbacks();
    render(<NewJournalEntryPhotoSuggestion {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose photos" }));
    expect(props.onAddPhotos).toHaveBeenCalledTimes(1);
    expect(props.onTakePhoto).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
    expect(props.onTakePhoto).toHaveBeenCalledTimes(1);
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it("gives the close control a larger touch target and visible focus styling", () => {
    render(<NewJournalEntryPhotoSuggestion {...callbacks()} />);
    expect(screen.getByRole("button", { name: "Dismiss photo suggestion" })).toHaveClass(
      "h-11",
      "min-w-11",
      "touch-manipulation",
      "focus-visible:ring-2",
    );
  });
});
