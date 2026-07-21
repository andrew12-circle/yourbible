import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MyAiProjectMemoryDialog from "@/components/myai/MyAiProjectMemoryDialog";

describe("MyAiProjectMemoryDialog", () => {
  it("renders existing memory and saves normalized updates", () => {
    const onSave = vi.fn();

    render(
      <MyAiProjectMemoryDialog
        open
        project={{
          id: "project-1",
          name: "Loom AI",
          memory: "Connect answers back to prior project decisions.",
          sort_order: 0,
        }}
        saving={false}
        onOpenChange={() => {}}
        onSave={onSave}
      />,
    );

    const textarea = screen.getByLabelText("What should stay connected?");
    expect(textarea).toHaveValue("Connect answers back to prior project decisions.");

    fireEvent.change(textarea, {
      target: { value: "  Remember the user's fear of lost context.\r\nKeep answers connected.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save memory" }));

    expect(onSave).toHaveBeenCalledWith(
      "Remember the user's fear of lost context.\nKeep answers connected.",
    );
  });
});
