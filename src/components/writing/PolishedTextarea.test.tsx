import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PolishedTextarea } from "./PolishedTextarea";

describe("PolishedTextarea", () => {
  it("forwards focus and blur handlers through privacy blur bindings", () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();

    render(
      <PolishedTextarea
        aria-label="Journal entry"
        value=""
        onChange={() => {}}
        onFocus={onFocus}
        onBlur={onBlur}
      />,
    );

    const textarea = screen.getByLabelText("Journal entry");
    fireEvent.focus(textarea);
    fireEvent.blur(textarea);

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
